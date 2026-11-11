import { prisma } from "../lib/prisma.js";
import type {
  CriarFormaPagamentoDTO,
  AtualizarFormaPagamentoDTO,
} from "../validators/formaPagamento.validator.js";

export async function criar(dados: CriarFormaPagamentoDTO) {
  return prisma.formaPagamento.create({ data: dados });
}

export async function listar() {
  return prisma.formaPagamento.findMany({ orderBy: { nome: "asc" } });
}

export async function buscarPorId(id: number) {
  return prisma.formaPagamento.findUniqueOrThrow({ where: { id } });
}

export async function atualizar(id: number, dados: AtualizarFormaPagamentoDTO) {
  return prisma.formaPagamento.update({ where: { id }, data: dados });
}

export async function remover(id: number) {
  await prisma.formaPagamento.delete({ where: { id } });
}
