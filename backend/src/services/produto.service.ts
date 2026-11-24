import { Prisma } from "@prisma/client";
import { prisma, type Tx } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type {
  CriarProdutoDTO,
  AtualizarProdutoDTO,
  ListarProdutosQuery,
} from "../validators/produto.validator.js";

const TIPO_PRODUTO = "PRODUTO";

const comRelacoes = {
  itemVendavel: true,
  categoria: true,
} satisfies Prisma.ProdutoInclude;

// Formato devolvido pela API: "achatado", escondendo do consumidor que por
// dentro existem duas tabelas (item_vendavel + produto). Documentado como
// decisão de design — ver explicação enviada ao usuário.
type ProdutoComRelacoes = Prisma.ProdutoGetPayload<{
  include: typeof comRelacoes;
}>;

function achatar(produto: ProdutoComRelacoes) {
  return {
    id: produto.id,
    nome: produto.itemVendavel.nome,
    preco: produto.itemVendavel.preco,
    ativo: produto.itemVendavel.ativo,
    categoriaId: produto.categoriaId,
    categoriaNome: produto.categoria.nome,
    descricao: produto.descricao,
  };
}

// 400 com mensagem clara, em vez de deixar a FK do banco recusar.
async function exigirCategoria(tx: Tx, categoriaId: number) {
  const categoria = await tx.categoria.findUnique({
    where: { id: categoriaId },
    select: { id: true },
  });
  if (!categoria) {
    throw new AppError(400, `Categoria ${categoriaId} não existe.`);
  }
}

export async function criar(dados: CriarProdutoDTO) {
  const { nome, preco, ativo, categoriaId, descricao } = dados;

  const produto = await prisma.$transaction(async (tx) => {
    await exigirCategoria(tx, categoriaId);

    // 1. Cria o supertipo primeiro — é dele que vem o id compartilhado.
    const itemVendavel = await tx.itemVendavel.create({
      data: { nome, preco, ativo, tipo: TIPO_PRODUTO },
    });

    // 2. Cria o subtipo usando o MESMO id (chave compartilhada, não FK
    // autoincrement própria). Os triggers de database/init/001_schema.sql
    // mantêm item_vendavel.tipo consistente e conferem, no COMMIT, que o
    // item existe em exatamente uma das tabelas-filha.
    await tx.produto.create({
      data: { id: itemVendavel.id, categoriaId, descricao },
    });

    // 3. Relê com os relacionamentos já carregados, pra devolver o
    // formato achatado de uma vez.
    return tx.produto.findUniqueOrThrow({
      where: { id: itemVendavel.id },
      include: comRelacoes,
    });
  });

  return achatar(produto);
}

export async function listar({
  ativo,
  categoriaId,
  ...pagina
}: ListarProdutosQuery) {
  const where: Prisma.ProdutoWhereInput = {
    ...(categoriaId === undefined ? {} : { categoriaId }),
    ...(ativo === undefined ? {} : { itemVendavel: { ativo } }),
  };

  const [produtos, total] = await prisma.$transaction([
    prisma.produto.findMany({
      where,
      include: comRelacoes,
      orderBy: { id: "asc" },
      ...recorte(pagina),
    }),
    prisma.produto.count({ where }),
  ]);

  return paginar(produtos.map(achatar), total, pagina);
}

export async function buscarPorId(id: number) {
  const produto = await prisma.produto.findUniqueOrThrow({
    where: { id },
    include: comRelacoes,
  });

  return achatar(produto);
}

export async function atualizar(id: number, dados: AtualizarProdutoDTO) {
  const { nome, preco, ativo, categoriaId, descricao } = dados;

  const produto = await prisma.$transaction(async (tx) => {
    // Confirma primeiro que o id é de um produto (e não de um combo, que
    // compartilha a mesma sequência de ids via item_vendavel).
    await tx.produto.findUniqueOrThrow({ where: { id }, select: { id: true } });

    if (nome !== undefined || preco !== undefined || ativo !== undefined) {
      await tx.itemVendavel.update({
        where: { id },
        data: { nome, preco, ativo },
      });
    }

    if (categoriaId !== undefined || descricao !== undefined) {
      if (categoriaId !== undefined) await exigirCategoria(tx, categoriaId);
      await tx.produto.update({
        where: { id },
        data: { categoriaId, descricao },
      });
    }

    return tx.produto.findUniqueOrThrow({
      where: { id },
      include: comRelacoes,
    });
  });

  return achatar(produto);
}

export async function remover(id: number) {
  await removerOuExplicar(
    () =>
      prisma.$transaction(async (tx) => {
        // Apaga o PRODUTO primeiro: isso confirma que o id realmente é de um
        // produto (não de um combo — os dois compartilham a mesma sequência
        // de id via item_vendavel). Se o id for de um combo, esta linha lança
        // P2025 e a transação é desfeita antes de tocar em item_vendavel.
        await tx.produto.delete({ where: { id } });

        // Só agora apaga o supertipo. (ON DELETE CASCADE também apagaria o
        // produto se fizéssemos isso primeiro — mas a ordem acima é a que nos
        // dá a checagem de segurança extra.)
        await tx.itemVendavel.delete({ where: { id } });
      }),
    "Produto já vendido ou usado em combo não pode ser removido: desative-o (ativo = false) para tirá-lo do cardápio.",
  );
}
