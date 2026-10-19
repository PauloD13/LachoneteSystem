import { prisma } from "../lib/prisma.js"; // Ajuste para { prisma } caso seu lib/prisma.ts use named export
import type {
  CriarClienteDTO,
  AtualizarClienteDTO,
} from "../validators/cliente.validator.js";

export async function criar(dados: CriarClienteDTO) {
  return prisma.cliente.create({
    data: dados,
  });
}

export async function listar() {
  return prisma.cliente.findMany({
    orderBy: { id: "asc" },
  });
}

export async function buscarPorId(id: number) {
  return prisma.cliente.findUniqueOrThrow({
    where: { id },
  });
}

export async function atualizar(id: number, dados: AtualizarClienteDTO) {
  return prisma.cliente.update({
    where: { id },
    data: dados,
  });
}

export async function remover(id: number) {
  await prisma.cliente.delete({
    where: { id },
  });
}
