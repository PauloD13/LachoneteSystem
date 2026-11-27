// Conexão única com GET /api/eventos (Server-Sent Events), dividida por todas
// as telas abertas. Usa fetch, e não EventSource, porque EventSource não
// envia o cabeçalho Authorization. Cai? Reconecta sozinha, esperando cada vez
// mais (1 s, 2 s, 4 s... até 30 s).

import { separarEventos } from "../lib/sse";
import type { StatusPedido } from "../types/dominio";
import { tokenAtual } from "./api";

export interface EventoDePedido {
  id: number;
  statusAtual: StatusPedido;
}

type Ouvinte = (evento: EventoDePedido) => void;

const ouvintes = new Set<Ouvinte>();
const observadores = new Set<() => void>();
let conectado = false;
let controle: AbortController | null = null;
let espera = 1000;
let proximaTentativa: ReturnType<typeof setTimeout> | undefined;

function marcar(valor: boolean) {
  if (conectado === valor) return;
  conectado = valor;
  observadores.forEach((avisar) => avisar());
}

async function conectar(): Promise<void> {
  const token = tokenAtual();
  if (!token || ouvintes.size === 0) return;
  const meu = new AbortController();
  controle = meu;
  try {
    const resposta = await fetch("/api/eventos", {
      headers: { Authorization: `Bearer ${token}` },
      signal: meu.signal,
    });
    if (!resposta.ok || !resposta.body) throw new Error(`${resposta.status}`);
    marcar(true);
    espera = 1000;
    const leitor = resposta.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    let resto = "";
    for (;;) {
      const { value, done } = await leitor.read();
      if (done) break;
      const separados = separarEventos(resto + value);
      resto = separados.resto;
      for (const { evento, dados } of separados.eventos) {
        if (evento !== "pedido") continue;
        const pedido = JSON.parse(dados) as EventoDePedido;
        ouvintes.forEach((ouvir) => ouvir(pedido));
      }
    }
  } catch {
    // Queda, servidor reiniciando ou cancelamento: tratado logo abaixo.
  }
  marcar(false);
  if (meu.signal.aborted || controle !== meu) return;
  controle = null;
  proximaTentativa = setTimeout(() => void conectar(), espera);
  espera = Math.min(espera * 2, 30_000);
}

/** Recebe cada mudança de pedido; devolve a função que cancela. */
export function assinarPedidos(ouvir: Ouvinte): () => void {
  ouvintes.add(ouvir);
  if (!controle) {
    clearTimeout(proximaTentativa);
    void conectar();
  }
  return () => {
    ouvintes.delete(ouvir);
    if (ouvintes.size > 0) return;
    clearTimeout(proximaTentativa);
    controle?.abort();
    controle = null;
    marcar(false);
  };
}

/** Para useSyncExternalStore: avisa quando a conexão abre ou cai. */
export function observarConexao(avisar: () => void): () => void {
  observadores.add(avisar);
  return () => observadores.delete(avisar);
}

export function estaConectado(): boolean {
  return conectado;
}
