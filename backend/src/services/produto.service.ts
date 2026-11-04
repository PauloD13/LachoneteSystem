import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type {
  CriarProdutoDTO,
  AtualizarProdutoDTO,
} from "../validators/produto.validator.js";

const TIPO_PRODUTO = "PRODUTO";

// Formato devolvido pela API: "achatado", escondendo do consumidor que por
// dentro existem duas tabelas (item_vendavel + produto). Documentado como
// decisão de design — ver explicação enviada ao usuário.
type ProdutoComRelacoes = Prisma.ProdutoGetPayload<{
  include: { itemVendavel: true; categoria: true };
}>;

function achatar(produto: ProdutoComRelacoes) {
  return {
    id: produto.id,
    nome: produto.itemVendavel.nome,
    preco: produto.itemVendavel.preco,
    categoriaId: produto.categoriaId,
    categoriaNome: produto.categoria.nome,
    descricao: produto.descricao,
  };
}

export async function criar(dados: CriarProdutoDTO) {
  const { nome, preco, categoriaId, descricao } = dados;

  const produto = await prisma.$transaction(async (tx) => {
    // 1. Cria o supertipo primeiro — é dele que vem o id compartilhado.
    const itemVendavel = await tx.itemVendavel.create({
      data: { nome, preco, tipo: TIPO_PRODUTO },
    });

    // 2. Cria o subtipo usando o MESMO id (chave compartilhada, não FK
    // autoincrement própria). O trigger trg_produto_set_tipo (ver
    // database/init/001_schema.sql) garante que item_vendavel.tipo fique
    // consistente — não precisamos repetir essa lógica aqui.
    await tx.produto.create({
      data: { id: itemVendavel.id, categoriaId, descricao },
    });

    // 3. Relê com os relacionamentos já carregados, pra devolver o
    // formato achatado de uma vez.
    return tx.produto.findUniqueOrThrow({
      where: { id: itemVendavel.id },
      include: { itemVendavel: true, categoria: true },
    });
  });

  return achatar(produto);
}

export async function listar() {
  const produtos = await prisma.produto.findMany({
    include: { itemVendavel: true, categoria: true },
    orderBy: { id: "asc" },
  });

  return produtos.map(achatar);
}

export async function buscarPorId(id: number) {
  const produto = await prisma.produto.findUniqueOrThrow({
    where: { id },
    include: { itemVendavel: true, categoria: true },
  });

  return achatar(produto);
}

export async function atualizar(id: number, dados: AtualizarProdutoDTO) {
  const { nome, preco, categoriaId, descricao } = dados;

  const produto = await prisma.$transaction(async (tx) => {
    if (nome !== undefined || preco !== undefined) {
      await tx.itemVendavel.update({
        where: { id },
        data: { nome, preco },
      });
    }

    if (categoriaId !== undefined || descricao !== undefined) {
      await tx.produto.update({
        where: { id },
        data: { categoriaId, descricao },
      });
    }

    return tx.produto.findUniqueOrThrow({
      where: { id },
      include: { itemVendavel: true, categoria: true },
    });
  });

  return achatar(produto);
}

export async function remover(id: number) {
  await prisma.$transaction(async (tx) => {
    // Apaga o PRODUTO primeiro: isso confirma que o id realmente é de um
    // produto (não de um combo — os dois compartilham a mesma sequência
    // de id via item_vendavel). Se o id for de um combo, esta linha lança
    // P2025 e a transação é desfeita antes de tocar em item_vendavel.
    await tx.produto.delete({ where: { id } });

    // Só agora apaga o supertipo. (ON DELETE CASCADE também apagaria o
    // produto se fizéssemos isso primeiro — mas a ordem acima é a que nos
    // dá a checagem de segurança extra.)
    await tx.itemVendavel.delete({ where: { id } });
  });
}
