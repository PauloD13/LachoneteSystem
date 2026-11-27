import { EventEmitter } from "node:events";
import type { Request, Response } from "express";

/** O que as telas precisam saber para recarregar: qual pedido e em que status. */
export interface EventoDePedido {
  id: number;
  statusAtual: string;
}

// Canal na memória do processo: basta para um único container. Com várias
// réplicas do backend seria preciso um canal compartilhado (ex.: Redis, ou o
// LISTEN/NOTIFY do Postgres).
const canal = new EventEmitter();
canal.setMaxListeners(0); // uma assinatura por aparelho conectado

const conexoes = new Set<Response>();

/** Avisa todas as telas conectadas de que um pedido mudou. */
export function publicarPedido(evento: EventoDePedido): void {
  canal.emit("pedido", evento);
}

/**
 * GET /api/eventos — Server-Sent Events: a conexão fica aberta e recebe uma
 * linha `event: pedido` a cada mudança. O comentário ":" a cada 25 s mantém
 * a conexão viva em proxies e roteadores que derrubam conexões ociosas.
 */
export function transmitirEventos(req: Request, res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Desliga o buffer de proxies como o nginx, que seguraria os eventos.
    "X-Accel-Buffering": "no",
  });
  res.write(": conectado\n\n");

  const enviar = (evento: EventoDePedido) => {
    res.write(`event: pedido\ndata: ${JSON.stringify(evento)}\n\n`);
  };
  canal.on("pedido", enviar);
  const batida = setInterval(() => res.write(": ping\n\n"), 25_000);
  conexoes.add(res);

  req.on("close", () => {
    clearInterval(batida);
    canal.off("pedido", enviar);
    conexoes.delete(res);
  });
}

/**
 * Fecha as conexões abertas: sem isso, o server.close() do encerramento
 * esperaria para sempre por elas. As telas reconectam sozinhas.
 */
export function encerrarEventos(): void {
  for (const res of conexoes) res.end();
  conexoes.clear();
}
