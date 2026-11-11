import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/appError.js";

// Rota inexistente: responde JSON (o padrão do Express seria uma página HTML).
export function rotaNaoEncontrada(_req: Request, res: Response): void {
  res.status(404).json({ error: "Rota não encontrada." });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1. Erro de validação do Zod -> 400 Bad Request
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Erro de validação nos dados enviados.",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // 2. Regra de negócio violada (lançada pelos services)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // 3. Erros do próprio Express ao ler o corpo (JSON malformado, corpo grande
  // demais). São erros do cliente: sem este bloco cairiam no 500 genérico.
  if (err instanceof Error && "type" in err) {
    if (err.type === "entity.parse.failed") {
      res.status(400).json({ error: "JSON inválido no corpo da requisição." });
      return;
    }
    if (err.type === "entity.too.large") {
      res.status(413).json({ error: "Corpo da requisição grande demais." });
      return;
    }
  }

  // 4. Erros conhecidos do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        const target =
          (err.meta?.target as string[])?.join(", ") || "campo único";
        res.status(409).json({
          error: `Conflito: já existe um registro com este valor (${target}).`,
          code: err.code,
        });
        return;
      }

      case "P2025": {
        res.status(404).json({
          error: "Registro não encontrado.",
          code: err.code,
        });
        return;
      }

      // P2003 acontece nos dois sentidos: apontar para um registro que não
      // existe, ou remover um registro que ainda é referenciado.
      case "P2003": {
        res.status(409).json({
          error:
            "Violação de chave estrangeira: o registro referenciado não existe ou ainda há registros vinculados a este.",
          code: err.code,
        });
        return;
      }

      // Valor maior que a coluna comporta (texto longo demais).
      case "P2000": {
        res.status(400).json({
          error: "Valor maior que o tamanho permitido para o campo.",
          code: err.code,
        });
        return;
      }
    }
  }

  // 5. Violação de CHECK constraint (ex.: data_fim >= data_inicio em
  // funcionario_cargo). Testado na prática: isso NÃO chega como
  // PrismaClientKnownRequestError com um código "P2xxx" — chega como
  // PrismaClientUnknownRequestError, com o erro bruto do Postgres
  // (SQLSTATE 23514 = check_violation) dentro da mensagem.
  if (
    err instanceof Prisma.PrismaClientUnknownRequestError &&
    err.message.includes("violates check constraint")
  ) {
    res.status(400).json({
      error: "Dados inválidos: violam uma restrição do banco de dados.",
    });
    return;
  }

  // 6. Qualquer outro erro não esperado -> Loga no servidor e responde 500 genérico
  console.error("[Unhandled Error]:", err);
  res.status(500).json({
    error: "Erro interno do servidor.",
  });
}
