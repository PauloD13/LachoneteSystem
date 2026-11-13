import { prisma } from "../lib/prisma.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type {
  CriarVariacaoDTO,
  AtualizarVariacaoDTO,
} from "../validators/variacao.validator.js";

// Garante 404 quando o produto da URL não existe (em vez de devolver lista
// vazia ou um erro de chave estrangeira).
async function exigirProduto(produtoId: number) {
  await prisma.produto.findUniqueOrThrow({
    where: { id: produtoId },
    select: { id: true },
  });
}

export async function criar(produtoId: number, dados: CriarVariacaoDTO) {
  await exigirProduto(produtoId);
  return prisma.variacao.create({ data: { ...dados, produtoId } });
}

export async function listar(produtoId: number) {
  await exigirProduto(produtoId);
  return prisma.variacao.findMany({
    where: { produtoId },
    orderBy: { id: "asc" },
  });
}

// where combinado (id + produtoId): só altera/remove a variação se ela
// realmente pertencer ao produto da URL.
export async function atualizar(
  produtoId: number,
  variacaoId: number,
  dados: AtualizarVariacaoDTO,
) {
  return prisma.variacao.update({
    where: { id: variacaoId, produtoId },
    data: dados,
  });
}

export async function remover(produtoId: number, variacaoId: number) {
  await removerOuExplicar(
    () => prisma.variacao.delete({ where: { id: variacaoId, produtoId } }),
    "Variação já vendida em pedidos não pode ser removida.",
  );
}
