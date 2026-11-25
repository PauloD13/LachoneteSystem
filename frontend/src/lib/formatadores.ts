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
