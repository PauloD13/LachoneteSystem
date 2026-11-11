import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import type {
  CriarComboDTO,
  AtualizarComboDTO,
} from "../validators/combo.validator.js";

// Combo é o segundo subtipo de item_vendavel — mesmo padrão de
// produto.service.ts (duas tabelas com id compartilhado, sempre em transação).

const TIPO_COMBO = "COMBO";

const comRelacoes = {
  itemVendavel: true,
  comboItens: {
    include: { produto: { include: { itemVendavel: true } } },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.ComboInclude;

type ComboComRelacoes = Prisma.ComboGetPayload<{ include: typeof comRelacoes }>;

function achatar(combo: ComboComRelacoes) {
  return {
    id: combo.id,
    nome: combo.itemVendavel.nome,
    preco: combo.itemVendavel.preco,
    descricao: combo.descricao,
    itens: combo.comboItens.map((item) => ({
      produtoId: item.produtoId,
      nome: item.produto.itemVendavel.nome,
      precoIndividual: item.produto.itemVendavel.preco,
      quantidade: item.quantidade,
    })),
  };
}

async function exigirProdutos(
  tx: Prisma.TransactionClient,
  produtoIds: number[],
) {
  const encontrados = await tx.produto.findMany({
    where: { id: { in: produtoIds } },
    select: { id: true },
  });
  const existentes = new Set(encontrados.map((p) => p.id));
  const faltando = produtoIds.filter((id) => !existentes.has(id));
  if (faltando.length > 0) {
    throw new AppError(
      400,
      `Produto(s) inexistente(s): ${faltando.join(", ")}.`,
    );
  }
}

export async function criar(dados: CriarComboDTO) {
  const { nome, preco, descricao, itens } = dados;

  const combo = await prisma.$transaction(async (tx) => {
    await exigirProdutos(
      tx,
      itens.map((i) => i.produtoId),
    );

    const itemVendavel = await tx.itemVendavel.create({
      data: { nome, preco, tipo: TIPO_COMBO },
    });

    await tx.combo.create({
      data: {
        id: itemVendavel.id,
        descricao,
        comboItens: { create: itens },
      },
    });

    return tx.combo.findUniqueOrThrow({
      where: { id: itemVendavel.id },
      include: comRelacoes,
    });
  });

  return achatar(combo);
}

export async function listar() {
  const combos = await prisma.combo.findMany({
    include: comRelacoes,
    orderBy: { id: "asc" },
  });
  return combos.map(achatar);
}

export async function buscarPorId(id: number) {
  const combo = await prisma.combo.findUniqueOrThrow({
    where: { id },
    include: comRelacoes,
  });
  return achatar(combo);
}

export async function atualizar(id: number, dados: AtualizarComboDTO) {
  const { nome, preco, descricao, itens } = dados;

  const combo = await prisma.$transaction(async (tx) => {
    // Confirma primeiro que o id é de um combo (e não de um produto, que
    // compartilha a mesma sequência de ids via item_vendavel).
    await tx.combo.findUniqueOrThrow({ where: { id }, select: { id: true } });

    if (nome !== undefined || preco !== undefined) {
      await tx.itemVendavel.update({ where: { id }, data: { nome, preco } });
    }

    if (descricao !== undefined) {
      await tx.combo.update({ where: { id }, data: { descricao } });
    }

    if (itens !== undefined) {
      await exigirProdutos(
        tx,
        itens.map((i) => i.produtoId),
      );
      await tx.comboItem.deleteMany({ where: { comboId: id } });
      await tx.comboItem.createMany({
        data: itens.map((i) => ({ ...i, comboId: id })),
      });
    }

    return tx.combo.findUniqueOrThrow({
      where: { id },
      include: comRelacoes,
    });
  });

  return achatar(combo);
}

export async function remover(id: number) {
  await prisma.$transaction(async (tx) => {
    // Mesma trava do produto: apagar o subtipo primeiro confirma que o id é
    // de um combo antes de tocar no item_vendavel.
    await tx.combo.delete({ where: { id } });
    await tx.itemVendavel.delete({ where: { id } });
  });
}
