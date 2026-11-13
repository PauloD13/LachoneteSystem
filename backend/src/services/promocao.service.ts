import { Prisma } from "@prisma/client";
import { prisma, type Tx } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { hojeComoData, somarDias } from "../lib/datas.js";
import { validarDescontoEVigencia } from "../lib/desconto.js";
import { paginar, recorte } from "../lib/paginacao.js";
import type {
  CriarPromocaoDTO,
  AtualizarPromocaoDTO,
  ListarPromocoesQuery,
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
  tx: Tx,
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

export async function listar({ ativaEm, ...pagina }: ListarPromocoesQuery) {
  const where: Prisma.PromocaoWhereInput = ativaEm
    ? { dataInicio: { lte: ativaEm }, dataFim: { gte: ativaEm } }
    : {};

  const [promocoes, total] = await prisma.$transaction([
    prisma.promocao.findMany({
      where,
      include: comProdutos,
      orderBy: [{ dataInicio: "desc" }, { id: "desc" }],
      ...recorte(pagina),
    }),
    prisma.promocao.count({ where }),
  ]);
  return paginar(promocoes.map(achatar), total, pagina);
}

export async function buscarPorId(id: number) {
  const promocao = await prisma.promocao.findUniqueOrThrow({
    where: { id },
    include: comProdutos,
  });
  return achatar(promocao);
}

// Regra de negócio 4.7: a lanchonete precisa saber quais promoções estiveram
// ativas em cada período, mesmo depois de encerradas. Uma promoção que já
// vigorou em algum dia ANTERIOR a hoje é, portanto, um registro histórico:
//   - não pode ser apagada;
//   - não pode ter a regra reescrita (desconto, início, produtos) — isso
//     seria alterar o passado;
//   - pode ser renomeada e ter a dataFim ajustada (é assim que se encerra ou
//     se prorroga), desde que o novo fim não seja anterior a ontem.
// Promoção que começa hoje ou no futuro ainda pode ser corrigida livremente.
function jaVigorou(promocao: { dataInicio: Date }): boolean {
  return promocao.dataInicio < hojeComoData();
}

const mesmoDia = (a: Date, b: Date) => a.getTime() === b.getTime();

export async function atualizar(id: number, dados: AtualizarPromocaoDTO) {
  const { produtoIds, ...campos } = dados;

  const promocao = await prisma.$transaction(async (tx) => {
    const atual = await tx.promocao.findUniqueOrThrow({
      where: { id },
      include: { produtoPromocoes: { select: { produtoId: true } } },
    });

    if (jaVigorou(atual)) {
      const produtosAtuais = new Set(
        atual.produtoPromocoes.map((pp) => pp.produtoId),
      );
      // Compara com o que está gravado: reenviar o formulário inteiro sem
      // mudar esses campos não é erro.
      const mudouRegra =
        (campos.tipoDesconto !== undefined &&
          campos.tipoDesconto !== atual.tipoDesconto) ||
        (campos.valorDesconto !== undefined &&
          !new Prisma.Decimal(campos.valorDesconto).equals(atual.valorDesconto)) ||
        (campos.dataInicio !== undefined &&
          !mesmoDia(campos.dataInicio, atual.dataInicio)) ||
        (produtoIds !== undefined &&
          (produtoIds.length !== produtosAtuais.size ||
            produtoIds.some((produtoId) => !produtosAtuais.has(produtoId))));
      if (mudouRegra) {
        throw new AppError(
          409,
          "Promoção que já esteve em vigor faz parte do histórico: só o nome e a dataFim podem ser alterados. Para mudar desconto, início ou produtos, encerre esta (dataFim) e crie outra.",
        );
      }
      if (
        campos.dataFim !== undefined &&
        !mesmoDia(campos.dataFim, atual.dataFim) &&
        campos.dataFim < somarDias(hojeComoData(), -1)
      ) {
        throw new AppError(
          409,
          "Não é possível encerrar a promoção com data retroativa: a dataFim mais antiga permitida é ontem.",
        );
      }
    }

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

export async function remover(id: number) {
  await prisma.$transaction(async (tx) => {
    const promocao = await tx.promocao.findUniqueOrThrow({ where: { id } });
    if (jaVigorou(promocao)) {
      throw new AppError(
        409,
        "Promoção que já esteve em vigor faz parte do histórico e não pode ser removida. Ajuste a dataFim para encerrá-la.",
      );
    }
    await tx.promocao.delete({ where: { id } });
  });
}
