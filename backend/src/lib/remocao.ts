import { Prisma } from "@prisma/client";
import { AppError } from "./appError.js";

// As FKs do banco são ON DELETE RESTRICT: o Postgres recusa apagar um
// registro que ainda é referenciado (ex.: produto que já foi vendido) e o
// Prisma devolve o erro P2003. Em vez da mensagem genérica do errorHandler,
// cada service informa aqui o motivo e o que fazer (em geral: desativar).
export async function removerOuExplicar(
  remover: () => Promise<unknown>,
  explicacao: string,
): Promise<void> {
  try {
    await remover();
  } catch (erro) {
    if (
      erro instanceof Prisma.PrismaClientKnownRequestError &&
      erro.code === "P2003"
    ) {
      throw new AppError(409, explicacao);
    }
    throw erro;
  }
}
