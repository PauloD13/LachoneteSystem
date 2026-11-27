import { Prisma } from "@prisma/client";
import { prisma, type Tx } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { hojeComoData } from "../lib/datas.js";
import { melhorPreco } from "../lib/precos.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type { TipoDeImagem } from "../lib/imagem.js";
import type {
  CriarProdutoDTO,
  AtualizarProdutoDTO,
  ListarProdutosQuery,
} from "../validators/produto.validator.js";

const TIPO_PRODUTO = "PRODUTO";

// Além do cadastro, cada produto sai com o preço do DIA (melhor promoção
// vigente, a mesma conta do registro de pedido) e quantas variações tem —
// a tela de pedido usa isso para decidir se o "+" já adiciona o item ou se
// precisa abrir a escolha de variação.
function comRelacoes(hoje: Date) {
  return {
    itemVendavel: true,
    categoria: true,
    // Só a data: os bytes da foto saem apenas em GET /produtos/:id/foto.
    foto: { select: { atualizadoEm: true } },
    _count: { select: { variacoes: true } },
    produtoPromocoes: {
      where: {
        promocao: { dataInicio: { lte: hoje }, dataFim: { gte: hoje } },
      },
      include: { promocao: true },
    },
  } satisfies Prisma.ProdutoInclude;
}

// Formato devolvido pela API: "achatado", escondendo do consumidor que por
// dentro existem duas tabelas (item_vendavel + produto).
type ProdutoComRelacoes = Prisma.ProdutoGetPayload<{
  include: ReturnType<typeof comRelacoes>;
}>;

function achatar(produto: ProdutoComRelacoes) {
  const vigente = melhorPreco(
    produto.itemVendavel.preco,
    produto.produtoPromocoes.map((pp) => pp.promocao),
  );
  return {
    id: produto.id,
    nome: produto.itemVendavel.nome,
    preco: produto.itemVendavel.preco,
    ativo: produto.itemVendavel.ativo,
    categoriaId: produto.categoriaId,
    categoriaNome: produto.categoria.nome,
    descricao: produto.descricao,
    precoVigente: vigente.preco.toFixed(2),
    promocaoVigente: vigente.promocao && {
      id: vigente.promocao.id,
      nome: vigente.promocao.nome,
      dataFim: vigente.promocao.dataFim,
    },
    totalVariacoes: produto._count.variacoes,
    // Versão da foto (ms), para a URL mudar quando a foto muda e o navegador
    // poder guardar cada versão em cache para sempre. null = sem foto.
    fotoVersao: produto.foto?.atualizadoEm.getTime() ?? null,
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

    // O supertipo vem primeiro porque é dele o id que o subtipo reusa (chave
    // compartilhada). No COMMIT, os triggers de 001_schema.sql conferem que
    // o item existe em exatamente uma das tabelas-filha.
    const itemVendavel = await tx.itemVendavel.create({
      data: { nome, preco, ativo, tipo: TIPO_PRODUTO },
    });

    await tx.produto.create({
      data: { id: itemVendavel.id, categoriaId, descricao },
    });

    return tx.produto.findUniqueOrThrow({
      where: { id: itemVendavel.id },
      include: comRelacoes(hojeComoData()),
    });
  });

  return achatar(produto);
}

export async function listar({
  ativo,
  categoriaId,
  busca,
  ...pagina
}: ListarProdutosQuery) {
  const where: Prisma.ProdutoWhereInput = {
    ...(categoriaId === undefined ? {} : { categoriaId }),
    itemVendavel: {
      ...(ativo === undefined ? {} : { ativo }),
      ...(busca ? { nome: { contains: busca, mode: "insensitive" } } : {}),
    },
  };

  const [produtos, total] = await prisma.$transaction([
    prisma.produto.findMany({
      where,
      include: comRelacoes(hojeComoData()),
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
    include: comRelacoes(hojeComoData()),
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
      include: comRelacoes(hojeComoData()),
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

// -----------------------------------------------------------------------------
// Foto
// -----------------------------------------------------------------------------

export async function definirFoto(
  id: number,
  tipo: TipoDeImagem,
  dados: Uint8Array<ArrayBuffer>,
) {
  await prisma.produto.findUniqueOrThrow({
    where: { id },
    select: { id: true },
  });
  await prisma.produtoFoto.upsert({
    where: { produtoId: id },
    create: { produtoId: id, tipo, dados },
    update: { tipo, dados, atualizadoEm: new Date() },
  });
  return buscarPorId(id);
}

export async function removerFoto(id: number) {
  await prisma.produto.findUniqueOrThrow({
    where: { id },
    select: { id: true },
  });
  await prisma.produtoFoto.deleteMany({ where: { produtoId: id } });
  return buscarPorId(id);
}

export async function buscarFoto(id: number) {
  const foto = await prisma.produtoFoto.findUnique({
    where: { produtoId: id },
  });
  if (!foto) throw new AppError(404, "Produto sem foto.");
  return foto;
}
