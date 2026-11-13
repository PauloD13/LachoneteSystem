import { prisma } from "../lib/prisma.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type { PaginacaoQuery } from "../validators/comum.js";
import type {
  CriarCategoriaDTO,
  AtualizarCategoriaDTO,
} from "../validators/categoria.validator.js";

export async function criar(dados: CriarCategoriaDTO) {
  return prisma.categoria.create({
    data: dados,
  });
}

export async function listar(pagina: PaginacaoQuery) {
  const [dados, total] = await prisma.$transaction([
    prisma.categoria.findMany({
      orderBy: [{ nome: "asc" }, { id: "asc" }],
      ...recorte(pagina),
    }),
    prisma.categoria.count(),
  ]);
  return paginar(dados, total, pagina);
}

export async function buscarPorId(id: number) {
  return prisma.categoria.findUniqueOrThrow({
    where: { id },
  });
}

export async function atualizar(id: number, dados: AtualizarCategoriaDTO) {
  return prisma.categoria.update({
    where: { id },
    data: dados,
  });
}

export async function remover(id: number) {
  await removerOuExplicar(
    () => prisma.categoria.delete({ where: { id } }),
    "Categoria com produtos cadastrados não pode ser removida. Mova os produtos para outra categoria antes.",
  );
}
