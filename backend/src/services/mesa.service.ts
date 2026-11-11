import { prisma } from "../lib/prisma.js";
import type {
  CriarMesaDTO,
  AtualizarMesaDTO,
} from "../validators/mesa.validator.js";

export async function criar(dados: CriarMesaDTO) {
  return prisma.mesa.create({ data: dados });
}

export async function listar() {
  return prisma.mesa.findMany({ orderBy: { numero: "asc" } });
}

export async function buscarPorId(id: number) {
  return prisma.mesa.findUniqueOrThrow({ where: { id } });
}

export async function atualizar(id: number, dados: AtualizarMesaDTO) {
  return prisma.mesa.update({ where: { id }, data: dados });
}

export async function remover(id: number) {
  await prisma.mesa.delete({ where: { id } });
}
