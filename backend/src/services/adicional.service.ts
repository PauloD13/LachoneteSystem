import { prisma } from "../lib/prisma.js";
import type {
  CriarAdicionalDTO,
  AtualizarAdicionalDTO,
} from "../validators/adicional.validator.js";

export async function criar(dados: CriarAdicionalDTO) {
  return prisma.adicional.create({ data: dados });
}

export async function listar() {
  return prisma.adicional.findMany({ orderBy: { nome: "asc" } });
}

export async function buscarPorId(id: number) {
  return prisma.adicional.findUniqueOrThrow({ where: { id } });
}

export async function atualizar(id: number, dados: AtualizarAdicionalDTO) {
  return prisma.adicional.update({ where: { id }, data: dados });
}

export async function remover(id: number) {
  await prisma.adicional.delete({ where: { id } });
}
