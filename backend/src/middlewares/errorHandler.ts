import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Erro de validação do Zod -> 400 Bad Request
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Erro de validação nos dados enviados.',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // 2. Erros conhecidos do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'campo único';
        res.status(409).json({
          error: `Conflito: já existe um registro com este valor (${target}).`,
          code: err.code,
        });
        return;
      }

      case 'P2025': {
        res.status(404).json({
          error: 'Registro não encontrado.',
          code: err.code,
        });
        return;
      }

      case 'P2003': {
        res.status(409).json({
          error: 'Operação bloqueada por violação de chave estrangeira (existem registros vinculados).',
          code: err.code,
        });
        return;
      }
    }
  }

  // 3. Qualquer outro erro não esperado -> Loga no servidor e responde 500 genérico
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    error: 'Erro interno do servidor.',
  });
}
