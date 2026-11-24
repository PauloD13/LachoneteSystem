import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

// Uma linha de log por requisição atendida: quem, o quê, resultado e duração.
// O id também volta no cabeçalho X-Request-Id e no corpo dos erros 500 — com
// ele dá para achar no log exatamente a requisição que o usuário reportou.
export function registrarRequisicao(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id = randomUUID();
  const inicio = process.hrtime.bigint();
  req.idRequisicao = id;
  res.setHeader("X-Request-Id", id);

  res.on("finish", () => {
    // Só o caminho: a query string e o corpo ficam fora do log.
    const rota = req.originalUrl.split("?")[0];
    if (rota === "/health" && res.statusCode === 200) return;

    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    logger.info("requisição", {
      id,
      metodo: req.method,
      rota,
      status: res.statusCode,
      ms: Math.round(ms),
      usuarioId: req.usuario?.id ?? null,
    });
  });

  next();
}
