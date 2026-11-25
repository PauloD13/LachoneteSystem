import type { Prisma } from "@prisma/client";
import { prisma, type Tx } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type {
  CriarAdicionalDTO,
  AtualizarAdicionalDTO,
  ListarAdicionaisQuery,
} from "../validators/adicional.validator.js";

// Toda resposta traz as categorias em que o adicional é oferecido, já
// achatadas: { ..., categorias: [{ id, nome }] }.
const comCategorias = {
  categorias: {
    select: { categoria: { select: { id: true, nome: true } } },
    orderBy: { categoria: { nome: "asc" } },
  },
} satisfies Prisma.AdicionalInclude;

type AdicionalDoBanco = Prisma.AdicionalGetPayload<{
  include: typeof comCategorias;
}>;

function formatar({ categorias, ...adicional }: AdicionalDoBanco) {
  return { ...adicional, categorias: categorias.map((c) => c.categoria) };
}

/**
 * Categorias de um item vendável: a do produto ou, num combo, as dos
 * produtos que o compõem. É por elas que se decide quais adicionais cabem
 * no item (usado também pelo registro de pedido).
 */
export async function categoriasDoItem(
  tx: Tx,
  itemVendavelId: number,
): Promise<number[]> {
  const item = await tx.itemVendavel.findUnique({
    where: { id: itemVendavelId },
    select: {
      produto: { select: { categoriaId: true } },
      combo: {
        select: {
          comboItens: {
            select: { produto: { select: { categoriaId: true } } },
          },
        },
      },
    },
  });
  if (!item) throw new AppError(404, "Item do cardápio não encontrado.");
  if (item.produto) return [item.produto.categoriaId];
  return [
    ...new Set(item.combo?.comboItens.map((c) => c.produto.categoriaId) ?? []),
  ];
}

async function exigirCategorias(tx: Tx, ids: number[]) {
  const existentes = await tx.categoria.count({ where: { id: { in: ids } } });
  if (existentes !== ids.length) {
    throw new AppError(404, "Uma ou mais categorias informadas não existem.");
  }
}

export async function criar({ categoriaIds, ...dados }: CriarAdicionalDTO) {
  return prisma.$transaction(async (tx) => {
    await exigirCategorias(tx, categoriaIds);
    const adicional = await tx.adicional.create({
      data: {
        ...dados,
        categorias: {
          create: categoriaIds.map((categoriaId) => ({ categoriaId })),
        },
      },
      include: comCategorias,
    });
    return formatar(adicional);
  });
}

export async function listar({
  ativo,
  categoriaId,
  itemVendavelId,
  ...pagina
}: ListarAdicionaisQuery) {
  const categorias: number[] = [];
  if (categoriaId !== undefined) categorias.push(categoriaId);
  if (itemVendavelId !== undefined) {
    categorias.push(...(await categoriasDoItem(prisma, itemVendavelId)));
  }
  const where: Prisma.AdicionalWhereInput = {
    ...(ativo === undefined ? {} : { ativo }),
    ...(categoriaId === undefined && itemVendavelId === undefined
      ? {}
      : { categorias: { some: { categoriaId: { in: categorias } } } }),
  };
  const [dados, total] = await prisma.$transaction([
    prisma.adicional.findMany({
      where,
      include: comCategorias,
      orderBy: [{ nome: "asc" }, { id: "asc" }],
      ...recorte(pagina),
    }),
    prisma.adicional.count({ where }),
  ]);
  return paginar(dados.map(formatar), total, pagina);
}

export async function buscarPorId(id: number) {
  return formatar(
    await prisma.adicional.findUniqueOrThrow({
      where: { id },
      include: comCategorias,
    }),
  );
}

export async function atualizar(
  id: number,
  { categoriaIds, ...dados }: AtualizarAdicionalDTO,
) {
  return prisma.$transaction(async (tx) => {
    if (categoriaIds) {
      await exigirCategorias(tx, categoriaIds);
      // Garante 404 antes de mexer na associativa.
      await tx.adicional.findUniqueOrThrow({
        where: { id },
        select: { id: true },
      });
      await tx.adicionalCategoria.deleteMany({ where: { adicionalId: id } });
      await tx.adicionalCategoria.createMany({
        data: categoriaIds.map((categoriaId) => ({
          adicionalId: id,
          categoriaId,
        })),
      });
    }
    return formatar(
      await tx.adicional.update({
        where: { id },
        data: dados,
        include: comCategorias,
      }),
    );
  });
}

export async function remover(id: number) {
  await removerOuExplicar(
    () => prisma.adicional.delete({ where: { id } }),
    "Adicional já vendido em pedidos não pode ser removido: desative-o (ativo = false).",
  );
}
