import type { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/appError.js";
import { logger } from "../lib/logger.js";

// Rota inexistente: responde JSON (o padrão do Express seria uma página HTML).
export function rotaNaoEncontrada(_req: Request, res: Response): void {
  res.status(404).json({ error: "Rota não encontrada." });
}

// Mensagem para cada violação de UNIQUE, por model do Prisma. O cliente da
// API recebe uma frase do domínio — nunca nomes de colunas, de índices ou
// códigos internos do Prisma, que só ajudariam quem está mapeando o banco.
const CONFLITOS: Record<string, string> = {
  Categoria: "Já existe uma categoria com este nome.",
  Cargo: "Já existe um cargo com este nome.",
  FormaPagamento: "Já existe uma forma de pagamento com este nome.",
  Mesa: "Já existe uma mesa com este número.",
  Cupom: "Já existe um cupom com este código.",
  Funcionario: "Este login já está em uso.",
  FuncionarioCargo: "O funcionário já exerce este cargo (há um vínculo em aberto).",
  Pedido: "Este cliente já utilizou este cupom.",
  AvaliacaoPedido: "Este pedido já foi avaliado.",
};

// Códigos do Prisma que significam "não consegui falar com o banco".
const BANCO_INDISPONIVEL = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

function bancoIndisponivel(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    BANCO_INDISPONIVEL.has(err.code)
  );
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1. Erro de validação do Zod -> 400 Bad Request
  if (err instanceof ZodError) {
    const { fieldErrors, formErrors } = z.flattenError(err);
    res.status(400).json({
      error: "Erro de validação nos dados enviados.",
      // `_geral` traz os erros que não pertencem a um campo específico
      // (ex.: o corpo enviado não é um objeto JSON).
      details:
        formErrors.length > 0 ? { ...fieldErrors, _geral: formErrors } : fieldErrors,
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

  // 4. Banco fora do ar: 503 (temporário, vale tentar de novo), não 500.
  if (bancoIndisponivel(err)) {
    logger.error("banco de dados indisponível", { id: req.idRequisicao, erro: err });
    res.status(503).json({
      error: "Serviço temporariamente indisponível. Tente novamente em instantes.",
    });
    return;
  }

  // 5. Erros conhecidos do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        const modelo = String(err.meta?.modelName ?? "");
        res.status(409).json({
          error: CONFLITOS[modelo] ?? "Já existe um registro com estes dados.",
        });
        return;
      }

      case "P2025": {
        res.status(404).json({ error: "Registro não encontrado." });
        return;
      }

      // P2003 acontece nos dois sentidos: apontar para um registro que não
      // existe, ou remover um registro que ainda é referenciado.
      case "P2003": {
        res.status(409).json({
          error:
            "Operação bloqueada por um vínculo entre registros: o registro referenciado não existe ou ainda há registros que dependem deste.",
        });
        return;
      }

      // Valor maior que a coluna comporta (texto longo demais).
      case "P2000": {
        res.status(400).json({
          error: "Valor maior que o tamanho permitido para o campo.",
        });
        return;
      }
    }
  }

  // 6. Restrições do banco que o Prisma não traduz para um código "P2xxx".
  // Testado na prática: chegam como PrismaClientUnknownRequestError, com o
  // erro bruto do Postgres dentro da mensagem.
  //   23514 = CHECK constraint (ex.: data_fim >= data_inicio)
  //   23000 = regra garantida por trigger (ver o final de 001_schema.sql)
  // A aplicação valida tudo isso antes; chegar aqui significa que uma regra
  // nova no banco ficou sem validação correspondente — por isso o log.
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    const violouCheck = err.message.includes("violates check constraint");
    const violouTrigger = /\b23000\b/.test(err.message);
    if (violouCheck || violouTrigger) {
      logger.warn("restrição do banco barrou uma operação", {
        id: req.idRequisicao,
        erro: err,
      });
      res.status(violouCheck ? 400 : 409).json({
        error: "Dados inválidos: violam uma regra de integridade do banco de dados.",
      });
      return;
    }
  }

  // 7. Qualquer outro erro não esperado -> loga no servidor e responde 500
  // genérico. O id permite localizar o erro no log sem expor detalhes.
  logger.error("erro não tratado", { id: req.idRequisicao, erro: err });
  res.status(500).json({
    error: "Erro interno do servidor.",
    requestId: req.idRequisicao,
  });
}
