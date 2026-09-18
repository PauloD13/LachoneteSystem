import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Dados inválidos", details: err.flatten().fieldErrors });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Registro duplicado", details: err.meta });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Registro não encontrado" });
    }
    if (err.code === "P2003") {
      return res.status(409).json({ error: "Referência inválida (chave estrangeira)", details: err.meta });
    }
  }

  console.error(err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}
