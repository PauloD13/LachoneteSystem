import { prisma } from "../lib/prisma.js";
import type {
  CriarCargoDTO,
  AtualizarCargoDTO,
} from "../validators/cargo.validator.js";

export async function criar(dados: CriarCargoDTO) {
  return prisma.cargo.create({
    data: dados,
  });
}

export async function listar() {
  return prisma.cargo.findMany({
    orderBy: { id: "asc" },
  });
}

export async function buscarPorId(id: number) {
  return prisma.cargo.findUniqueOrThrow({
    where: { id },
  });
}

export async function atualizar(id: number, dados: AtualizarCargoDTO) {
  return prisma.cargo.update({
    where: { id },
    data: dados,
  });
}

export async function remover(id: number) {
  await prisma.cargo.delete({
    where: { id },
  });
}
