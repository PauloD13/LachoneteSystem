import { prisma } from "../lib/prisma.js";
import type {
  CriarCargoDTO,
  AtualizarCargoDTO,
} from "../validators/cargo.validator.js";

export async function criar(dados: CriarCargoDTO) {
  return prisma.categoria.create({
    data: dados,
  });
}

export async function listar() {
  return prisma.categoria.findMany();
}

export async function buscarPorId(id: number) {
  return prisma.categoria.findUniqueOrThrow({
    where: { id },
  });
}

export async function atualizar(id: number, dados: AtualizarCargoDTO) {
  return prisma.categoria.update({
    where: { id },
    data: dados,
  });
}

export async function remover(id: number) {
  await prisma.categoria.delete({
    where: { id },
  });
}