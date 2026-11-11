import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import type {
  CriarIngredienteDTO,
  AtualizarIngredienteDTO,
} from "../validators/ingrediente.validator.js";

const comFornecedor = {
  fornecedor: { select: { id: true, nome: true } },
} as const;

async function exigirFornecedor(fornecedorId: number) {
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id: fornecedorId },
    select: { id: true },
  });
  if (!fornecedor) {
    throw new AppError(400, `Fornecedor ${fornecedorId} não existe.`);
  }
}

export async function criar(dados: CriarIngredienteDTO) {
  await exigirFornecedor(dados.fornecedorId);
  return prisma.ingrediente.create({ data: dados, include: comFornecedor });
}

export async function listar() {
  return prisma.ingrediente.findMany({
    include: comFornecedor,
    orderBy: { nome: "asc" },
  });
}

export async function buscarPorId(id: number) {
  return prisma.ingrediente.findUniqueOrThrow({
    where: { id },
    include: comFornecedor,
  });
}

export async function atualizar(id: number, dados: AtualizarIngredienteDTO) {
  if (dados.fornecedorId !== undefined) {
    await exigirFornecedor(dados.fornecedorId);
  }
  return prisma.ingrediente.update({
    where: { id },
    data: dados,
    include: comFornecedor,
  });
}

export async function remover(id: number) {
  await prisma.ingrediente.delete({ where: { id } });
}
