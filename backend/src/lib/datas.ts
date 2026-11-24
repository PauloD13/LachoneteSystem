import { environment } from "../config/env.js";

// O servidor (container) roda em UTC, mas "hoje" para a lanchonete é o dia
// no fuso do negócio (APP_TIMEZONE). Sem isso, depois das 21h em Brasília o
// servidor já consideraria o dia seguinte — e promoções/cupons mudariam de
// validade no meio do expediente.
//
// Convenção: colunas DATE chegam do Prisma como Date à meia-noite UTC. As
// funções abaixo devolvem "dias" nesse mesmo formato, para que comparações
// com colunas DATE sejam diretas.

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const formatadorDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: environment.APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatadorInstante = new Intl.DateTimeFormat("en-US", {
  timeZone: environment.APP_TIMEZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Dia de hoje no fuso do negócio, como Date à meia-noite UTC. */
export function hojeComoData(): Date {
  return new Date(`${formatadorDia.format(new Date())}T00:00:00Z`);
}

export function somarDias(dia: Date, quantidade: number): Date {
  return new Date(dia.getTime() + quantidade * MS_POR_DIA);
}

/**
 * Instante (UTC) em que um dia começa no fuso do negócio. Usado para filtrar
 * colunas TIMESTAMP (gravadas em UTC) por período informado em dias.
 */
export function inicioDoDia(dia: Date): Date {
  const partes = Object.fromEntries(
    formatadorInstante.formatToParts(dia).map((p) => [p.type, p.value]),
  );
  const relogioLocalComoUTC = Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour),
    Number(partes.minute),
    Number(partes.second),
  );
  const deslocamento = relogioLocalComoUTC - dia.getTime();
  return new Date(dia.getTime() - deslocamento);
}
