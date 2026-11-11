import { prisma } from "../lib/prisma.js";
import type {
  CriarFornecedorDTO,
  AtualizarFornecedorDTO,
} from "../validators/fornecedor.validator.js";

export async function criar(dados: CriarFornecedorDTO) {
  return prisma.fornecedor.create({ data: dados });
}

export async function listar() {
  return prisma.fornecedor.findMany({ orderBy: { nome: "asc" } });
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
  await prisma.fornecedor.delete({ where: { id } });
}
