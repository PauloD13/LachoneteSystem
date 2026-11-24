import { PrismaClient } from "@prisma/client";
import type { ITXClientDenyList } from "@prisma/client/runtime/library";
import { environment } from "../config/env.js";

function criarCliente() {
  return new PrismaClient({
    // A URL vem de config/env.ts (que sabe montá-la a partir de DB_HOST,
    // DB_USER... com a senha devidamente escapada), e não direto do
    // `env("DATABASE_URL")` do schema.prisma.
    datasourceUrl: environment.DATABASE_URL,
    // `omit` global: senha_hash NUNCA volta em nenhuma consulta de
    // funcionário, a menos que a consulta peça explicitamente
    // (`omit: { senhaHash: false }` — só o módulo de autenticação faz isso).
    // É uma trava "por padrão": esquecer de filtrar o campo em um endpoint
    // novo não vaza nada.
    omit: { funcionario: { senhaHash: true } },
  });
}

type Cliente = ReturnType<typeof criarCliente>;

/**
 * Tipo do `tx` recebido em `prisma.$transaction(async (tx) => ...)`.
 * Use este (e não `Prisma.TransactionClient`) em funções auxiliares que
 * aceitam tanto o client quanto uma transação: como o nosso client tem o
 * `omit` global configurado, o tipo genérico do Prisma não é compatível.
 */
export type Tx = Omit<Cliente, ITXClientDenyList>;

const globalForPrisma = globalThis as unknown as { prisma: Cliente | undefined };

export const prisma = globalForPrisma.prisma ?? criarCliente();

if (environment.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
