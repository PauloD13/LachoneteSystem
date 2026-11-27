import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  api,
  avancar,
  criarCategoria,
  criarFuncionario,
  criarProduto,
  ok,
} from "./apoio.ts";

const API_URL = process.env.API_URL ?? "http://localhost:3000/api";

/** Abre o fluxo de eventos e devolve uma função que espera o próximo evento de pedido que satisfaça `filtro`. */
async function conectar(token: string) {
  const controle = new AbortController();
  const resposta = await fetch(`${API_URL}/eventos`, {
    headers: { authorization: `Bearer ${token}` },
    signal: controle.signal,
  });
  assert.equal(resposta.status, 200);
  assert.match(
    resposta.headers.get("content-type") ?? "",
    /text\/event-stream/,
  );
  const leitor = resposta
    .body!.pipeThrough(new TextDecoderStream())
    .getReader();
  let resto = "";

  async function proximo(
    filtro: (evento: { id: number; statusAtual: string }) => boolean,
  ) {
    const prazo = Date.now() + 5000;
    while (Date.now() < prazo) {
      const blocos = resto.split("\n\n");
      resto = blocos.pop() ?? "";
      for (const bloco of blocos) {
        const dados = bloco
          .split("\n")
          .find((linha) => linha.startsWith("data: "));
        if (bloco.includes("event: pedido") && dados) {
          const evento = JSON.parse(dados.slice(6));
          if (filtro(evento)) return evento;
        }
      }
      const { value, done } = await leitor.read();
      if (done) break;
      resto += value;
    }
    throw new Error("evento não chegou a tempo");
  }

  return { proximo, fechar: () => controle.abort() };
}

describe("eventos em tempo real", () => {
  it("exige login", async () => {
    assert.equal((await api("GET", "/eventos")).status, 401);
  });

  it("avisa quem está conectado quando um pedido é criado ou muda de status", async () => {
    const atendente = await criarFuncionario("atendente");
    const cozinha = await criarFuncionario("cozinheiro");
    const produto = await criarProduto(await criarCategoria(), 10);
    const fluxo = await conectar(cozinha.token);
    try {
      const pedido = await ok(201, "POST", "/pedidos", {
        token: atendente.token,
        corpo: {
          canal: "BALCAO",
          itens: [{ itemVendavelId: produto.id, quantidade: 1 }],
        },
      });
      const criado = await fluxo.proximo((e) => e.id === pedido.id);
      assert.equal(criado.statusAtual, "RECEBIDO");

      await avancar(atendente.token, pedido.id, "EM_PREPARO");
      const emPreparo = await fluxo.proximo(
        (e) => e.id === pedido.id && e.statusAtual === "EM_PREPARO",
      );
      assert.equal(emPreparo.id, pedido.id);
    } finally {
      fluxo.fechar();
    }
  });

  it("limita as conexões abertas por login", async () => {
    const entregador = await criarFuncionario("entregador");
    const abertas = [];
    try {
      for (let i = 0; i < 10; i++)
        abertas.push(await conectar(entregador.token));
      const resposta = await fetch(`${API_URL}/eventos`, {
        headers: { authorization: `Bearer ${entregador.token}` },
      });
      assert.equal(resposta.status, 429);
    } finally {
      abertas.forEach((c) => c.fechar());
    }
  });
});
