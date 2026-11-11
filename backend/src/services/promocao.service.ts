import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { hojeComoData } from "../lib/datas.js";
import { validarDescontoEVigencia } from "../lib/desconto.js";
import type {
  CriarPromocaoDTO,
  AtualizarPromocaoDTO,
} from "../validators/promocao.validator.js";

const comProdutos = {
  produtoPromocoes: {
    include: { produto: { include: { itemVendavel: true } } },
    orderBy: { produtoId: "asc" },
  },
} satisfies Prisma.PromocaoInclude;

type PromocaoComProdutos = Prisma.PromocaoGetPayload<{
  include: typeof comProdutos;
}>;

function achatar(promocao: PromocaoComProdutos) {
  const { produtoPromocoes, ...dados } = promocao;
  return {
    ...dados,
    produtos: produtoPromocoes.map((pp) => ({
      id: pp.produtoId,
      nome: pp.produto.itemVendavel.nome,
      precoBase: pp.produto.itemVendavel.preco,
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

export async function criar(dados: CriarPromocaoDTO) {
  validarDescontoEVigencia(dados);
  const { produtoIds, ...campos } = dados;

  const promocao = await prisma.$transaction(async (tx) => {
    await exigirProdutos(tx, produtoIds);
    return tx.promocao.create({
      data: {
        ...campos,
        produtoPromocoes: {
          create: produtoIds.map((produtoId) => ({ produtoId })),
        },
      },
      include: comProdutos,
    });
  });

  return achatar(promocao);
}

export async function listar(ativaEm?: Date) {
  const promocoes = await prisma.promocao.findMany({
    where: ativaEm
      ? { dataInicio: { lte: ativaEm }, dataFim: { gte: ativaEm } }
      : {},
    include: comProdutos,
    orderBy: [{ dataInicio: "desc" }, { id: "desc" }],
  });
  return promocoes.map(achatar);
}

export async function buscarPorId(id: number) {
  const promocao = await prisma.promocao.findUniqueOrThrow({
    where: { id },
    include: comProdutos,
  });
  return achatar(promocao);
}

export async function atualizar(id: number, dados: AtualizarPromocaoDTO) {
  const { produtoIds, ...campos } = dados;

  const promocao = await prisma.$transaction(async (tx) => {
    const atual = await tx.promocao.findUniqueOrThrow({ where: { id } });
    validarDescontoEVigencia({
      tipoDesconto: campos.tipoDesconto ?? atual.tipoDesconto,
      valorDesconto: campos.valorDesconto ?? atual.valorDesconto,
      dataInicio: campos.dataInicio ?? atual.dataInicio,
      dataFim: campos.dataFim ?? atual.dataFim,
    });

    await tx.promocao.update({ where: { id }, data: campos });

    if (produtoIds !== undefined) {
      await exigirProdutos(tx, produtoIds);
      await tx.produtoPromocao.deleteMany({ where: { promocaoId: id } });
      await tx.produtoPromocao.createMany({
        data: produtoIds.map((produtoId) => ({ produtoId, promocaoId: id })),
      });
    }

    return tx.promocao.findUniqueOrThrow({
      where: { id },
      include: comProdutos,
    });
  });

  return achatar(promocao);
}

// Regra de negócio 4.7: a lanchonete precisa saber quais promoções estiveram
// ativas em cada período, mesmo depois de encerradas. Por isso uma promoção
// que já vigorou em algum dia anterior não pode ser apagada — para tirá-la do
// ar, encerra-se pela dataFim.
export async function remover(id: number) {
  await prisma.$transaction(async (tx) => {
    const promocao = await tx.promocao.findUniqueOrThrow({ where: { id } });
    if (promocao.dataInicio < hojeComoData()) {
      throw new AppError(
        409,
        "Promoção que já esteve em vigor faz parte do histórico e não pode ser removida. Ajuste a dataFim para encerrá-la.",
      );
    }
    await tx.promocao.delete({ where: { id } });
  });
}
