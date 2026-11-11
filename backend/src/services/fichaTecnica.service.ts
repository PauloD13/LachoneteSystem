import { prisma } from "../lib/prisma.js";

// Ficha técnica = linhas de produto_ingrediente de um produto (N:N com
// atributo). É a base do relatório de consumo estimado de ingredientes.

const comIngrediente = {
  ingrediente: { select: { id: true, nome: true, unidadeMedida: true } },
} as const;

async function exigirProduto(produtoId: number) {
  await prisma.produto.findUniqueOrThrow({
    where: { id: produtoId },
    select: { id: true },
  });
}

export async function listar(produtoId: number) {
  await exigirProduto(produtoId);
  return prisma.produtoIngrediente.findMany({
    where: { produtoId },
    include: comIngrediente,
    orderBy: { ingredienteId: "asc" },
  });
}

// PUT idempotente: inclui o ingrediente na ficha ou atualiza a quantidade se
// ele já estiver lá.
export async function definir(
  produtoId: number,
  ingredienteId: number,
  quantidadeUtilizada: number,
) {
  await exigirProduto(produtoId);
  await prisma.ingrediente.findUniqueOrThrow({
    where: { id: ingredienteId },
    select: { id: true },
  });

  return prisma.produtoIngrediente.upsert({
    where: { produtoId_ingredienteId: { produtoId, ingredienteId } },
    create: { produtoId, ingredienteId, quantidadeUtilizada },
    update: { quantidadeUtilizada },
    include: comIngrediente,
  });
}

export async function remover(produtoId: number, ingredienteId: number) {
  await prisma.produtoIngrediente.delete({
    where: { produtoId_ingredienteId: { produtoId, ingredienteId } },
  });
}
