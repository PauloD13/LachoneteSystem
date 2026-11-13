import { prisma } from "../lib/prisma.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type { PaginacaoQuery } from "../validators/comum.js";
import type {
  CriarFornecedorDTO,
  AtualizarFornecedorDTO,
} from "../validators/fornecedor.validator.js";

export async function criar(dados: CriarFornecedorDTO) {
  return prisma.fornecedor.create({ data: dados });
}

export async function listar(pagina: PaginacaoQuery) {
  const [dados, total] = await prisma.$transaction([
    prisma.fornecedor.findMany({
      orderBy: [{ nome: "asc" }, { id: "asc" }],
      ...recorte(pagina),
    }),
    prisma.fornecedor.count(),
  ]);
  return paginar(dados, total, pagina);
}

// Traz junto os ingredientes abastecidos por ele (relacionamento 1:N).
export async function buscarPorId(id: number) {
  return prisma.fornecedor.findUniqueOrThrow({
    where: { id },
    include: { ingredientes: { orderBy: { nome: "asc" } } },
  });
}

export async function atualizar(id: number, dados: AtualizarFornecedorDTO) {
  return prisma.fornecedor.update({ where: { id }, data: dados });
}

export async function remover(id: number) {
  await removerOuExplicar(
    () => prisma.fornecedor.delete({ where: { id } }),
    "Fornecedor que abastece ingredientes cadastrados não pode ser removido. Troque o fornecedor desses ingredientes antes.",
  );
}
