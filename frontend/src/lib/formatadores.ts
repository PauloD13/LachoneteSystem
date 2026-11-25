// Conversões para EXIBIR dados da API. Toda tela usa estas funções, para
// que um valor apareça igual em todo o sistema.

import type { Dia, Dinheiro, Instante } from "../types/api";

/** Fuso do negócio: o mesmo APP_TIMEZONE padrão do backend. */
export const FUSO_DO_NEGOCIO = "America/Sao_Paulo";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_DO_NEGOCIO,
  dateStyle: "short",
  timeStyle: "short",
});

const formatoHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_DO_NEGOCIO,
  hour: "2-digit",
  minute: "2-digit",
});

const formatoDiaISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_DO_NEGOCIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "27.5" ou 27.5 -> 27.5 (para fazer conta com valores da API). */
export function paraNumero(
  valor: Dinheiro | number | null | undefined,
): number {
  if (valor === null || valor === undefined || valor === "") return 0;
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

/** "27.5" -> "R$ 27,50" */
export function moeda(valor: Dinheiro | number | null | undefined): string {
  return formatoMoeda.format(paraNumero(valor));
}

/**
 * Dia de calendário da API ("2027-01-04T00:00:00.000Z") -> "04/01/2027".
 *
 * Lê só a parte AAAA-MM-DD, de propósito. Com `new Date(valor)` o navegador
 * converteria meia-noite UTC para o fuso do Brasil (21h do dia anterior) e
 * a tela mostraria 03/01/2027.
 */
export function dia(valor: Dia | null | undefined): string {
  if (!valor) return "";
  const [ano, mes, diaDoMes] = valor.slice(0, 10).split("-");
  return `${diaDoMes}/${mes}/${ano}`;
}

/** Instante da API -> "25/11/2026, 08:44" no horário de Brasília. */
export function dataHora(valor: Instante | null | undefined): string {
  return valor ? formatoDataHora.format(new Date(valor)) : "";
}

/** Instante da API -> "08:44" */
export function hora(valor: Instante | null | undefined): string {
  return valor ? formatoHora.format(new Date(valor)) : "";
}

/**
 * Hoje em AAAA-MM-DD, no fuso do negócio. É o formato de <input type="date">
 * e dos filtros de período da API.
 */
export function hojeISO(agora: Date = new Date()): string {
  return formatoDiaISO.format(agora);
}

/** Dia da API -> AAAA-MM-DD, para preencher um <input type="date">. */
export function diaParaInput(valor: Dia | null | undefined): string {
  return valor ? valor.slice(0, 10) : "";
}

/** 42 -> "#0042" (número do pedido com 4 dígitos, como no design). */
export function numeroPedido(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

/** Minutos inteiros desde um instante (para "há 12 min" e a cozinha). */
export function minutosDesde(
  valor: Instante | null | undefined,
  agora: number = Date.now(),
): number {
  if (!valor) return 0;
  return Math.max(0, Math.floor((agora - new Date(valor).getTime()) / 60000));
}

/** "há 5 min", "há 2 h", "agora". */
export function haQuantoTempo(
  valor: Instante | null | undefined,
  agora: number = Date.now(),
): string {
  const minutos = minutosDesde(valor, agora);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return dataHora(valor);
}

/** "(11) 98765-4321" a partir de qualquer coisa com 10 ou 11 dígitos. */
export function telefone(valor: string | null | undefined): string {
  if (!valor) return "";
  const d = valor.replace(/\D/g, "");
  if (d.length === 11)
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor;
}

/** Inicial para avatar: "maria souza" -> "M". */
export function inicial(nome: string | null | undefined): string {
  return (nome ?? "?").trim().charAt(0).toUpperCase() || "?";
}

/** Primeiro nome: "Maria Souza" -> "Maria". */
export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? "").trim().split(/\s+/)[0] ?? "";
}

/** "1.5" (kg) -> "1,5"; até 3 casas, sem zeros sobrando. */
export function quantidade(valor: string | number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
    paraNumero(valor as string),
  );
}

/** Data longa de hoje: "quarta-feira, 25 de novembro". */
export function hojePorExtenso(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_DO_NEGOCIO,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(agora);
}

/** Hora (0–23) agora, no fuso do negócio — para "Bom dia/Boa noite". */
export function horaAgora(agora: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: FUSO_DO_NEGOCIO,
      hour: "numeric",
      hourCycle: "h23",
    }).format(agora),
  );
}

export function saudacao(agora: Date = new Date()): string {
  const h = horaAgora(agora);
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Soma dias a um AAAA-MM-DD (para períodos de relatório). */
export function somarDiasISO(diaISO: string, dias: number): string {
  const data = new Date(`${diaISO}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}
