import { prisma } from "../lib/prisma.js";
import type {
  CriarFuncionarioDTO,
  AtualizarFuncionarioDTO,
} from "../validators/funcionario.validator.js";

export async function criar(dados: CriarFuncionarioDTO) {
  return prisma.funcionario.create({
    data: dados,
  });
}

export async function listar() {
  return prisma.funcionario.findMany({
    orderBy: { id: "asc" },
  });
}

export async function buscarPorId(id: number) {
  return prisma.funcionario.findUniqueOrThrow({
    where: { id },
  });
}

export async function atualizar(id: number, dados: AtualizarFuncionarioDTO) {
  return prisma.funcionario.update({
    where: { id },
    data: dados,
  });
}

export async function remover(id: number) {
  await prisma.funcionario.delete({
    where: { id },
  });
}
