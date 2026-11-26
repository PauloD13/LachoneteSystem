import { PrismaClient } from "@prisma/client";
import type { ITXClientDenyList } from "@prisma/client/runtime/library";
import { environment } from "../config/env.js";

function criarCliente() {
  return new PrismaClient({
    // Montada em config/env.ts (com a senha escapada), não lida do schema.prisma.
    datasourceUrl: environment.DATABASE_URL,
    // senha_hash fica fora de toda consulta, salvo quem pedir
    // `omit: { senhaHash: false }` (só a autenticação): endpoint novo não vaza.
    omit: { funcionario: { senhaHash: true } },
  });
}

type Cliente = ReturnType<typeof criarCliente>;

/**
 * Tipo do `tx` de `prisma.$transaction`. Use no lugar de
 * `Prisma.TransactionClient`, que não é compatível com o `omit` global acima.
 */
export type Tx = Omit<Cliente, ITXClientDenyList>;

const globalForPrisma = globalThis as unknown as {
  prisma: Cliente | undefined;
};

export const prisma = globalForPrisma.prisma ?? criarCliente();

if (environment.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
