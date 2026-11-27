import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type {
  CriarIngredienteDTO,
  AtualizarIngredienteDTO,
  ListarIngredientesQuery,
} from "../validators/ingrediente.validator.js";

const comFornecedor = {
  fornecedor: { select: { id: true, nome: true } },
} as const;

/** Estoque no mínimo ou abaixo dele; mínimo 0 desliga o alerta. */
function precisaRepor(ingrediente: {
  quantidadeEstoque: Prisma.Decimal;
  estoqueMinimo: Prisma.Decimal;
}): boolean {
  return (
    ingrediente.estoqueMinimo.greaterThan(0) &&
    ingrediente.quantidadeEstoque.lessThanOrEqualTo(ingrediente.estoqueMinimo)
  );
}

function comRepor<
  T extends {
    quantidadeEstoque: Prisma.Decimal;
    estoqueMinimo: Prisma.Decimal;
  },
>(ingrediente: T) {
  return { ...ingrediente, repor: precisaRepor(ingrediente) };
}

async function exigirFornecedor(fornecedorId: number) {
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id: fornecedorId },
    select: { id: true },
  });
  if (!fornecedor) {
    throw new AppError(400, `Fornecedor ${fornecedorId} não existe.`);
  }
}

export async function criar(dados: CriarIngredienteDTO) {
  await exigirFornecedor(dados.fornecedorId);
  return comRepor(
    await prisma.ingrediente.create({ data: dados, include: comFornecedor }),
  );
}

// Na listagem, cada ingrediente diz em quantos produtos é usado (fichas
// técnicas). ?ordem=estoque põe primeiro os de menor estoque — a tela de
// estoque mostra assim o que está acabando. ?repor=true traz só os que estão
// no mínimo ou abaixo (o total vira o contador do alerta).
export async function listar({
  fornecedorId,
  busca,
  ordem,
  repor,
  ...pagina
}: ListarIngredientesQuery) {
  const noMinimo: Prisma.IngredienteWhereInput = {
    estoqueMinimo: { gt: 0 },
    quantidadeEstoque: { lte: prisma.ingrediente.fields.estoqueMinimo },
  };
  const where: Prisma.IngredienteWhereInput = {
    ...(fornecedorId === undefined ? {} : { fornecedorId }),
    ...(busca ? { nome: { contains: busca, mode: "insensitive" } } : {}),
    ...(repor === undefined ? {} : repor ? noMinimo : { NOT: noMinimo }),
  };
  const orderBy: Prisma.IngredienteOrderByWithRelationInput[] =
    ordem === "estoque"
      ? [{ quantidadeEstoque: "asc" }, { nome: "asc" }, { id: "asc" }]
      : [{ nome: "asc" }, { id: "asc" }];
  const [dados, total] = await prisma.$transaction([
    prisma.ingrediente.findMany({
      where,
      include: {
        ...comFornecedor,
        _count: { select: { produtoIngredientes: true } },
      },
      orderBy,
      ...recorte(pagina),
    }),
    prisma.ingrediente.count({ where }),
  ]);
  return paginar(
    dados.map(({ _count, ...ingrediente }) => ({
      ...comRepor(ingrediente),
      usadoEm: _count.produtoIngredientes,
    })),
    total,
    pagina,
  );
}

// O detalhe traz os produtos que usam o ingrediente, com a quantidade de
// cada ficha técnica.
export async function buscarPorId(id: number) {
  const { produtoIngredientes, ...ingrediente } =
    await prisma.ingrediente.findUniqueOrThrow({
      where: { id },
      include: {
        ...comFornecedor,
        produtoIngredientes: {
          select: {
            quantidadeUtilizada: true,
            produto: {
              select: { id: true, itemVendavel: { select: { nome: true } } },
            },
          },
          orderBy: { produtoId: "asc" },
        },
      },
    });
  return {
    ...comRepor(ingrediente),
    produtos: produtoIngredientes.map((pi) => ({
      id: pi.produto.id,
      nome: pi.produto.itemVendavel.nome,
      quantidadeUtilizada: pi.quantidadeUtilizada,
    })),
  };
}

export async function atualizar(id: number, dados: AtualizarIngredienteDTO) {
  if (dados.fornecedorId !== undefined) {
    await exigirFornecedor(dados.fornecedorId);
  }
  return comRepor(
    await prisma.ingrediente.update({
      where: { id },
      data: dados,
      include: comFornecedor,
    }),
  );
}

export async function remover(id: number) {
  await removerOuExplicar(
    () => prisma.ingrediente.delete({ where: { id } }),
    "Ingrediente usado na ficha técnica de algum produto não pode ser removido. Retire-o das fichas técnicas antes.",
  );
}
