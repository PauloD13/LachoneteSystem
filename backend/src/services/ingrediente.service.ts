import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type {
  CriarIngredienteDTO,
  AtualizarIngredienteDTO,
  ListarIngredientesQuery,
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

export async function listar({
  fornecedorId,
  ...pagina
}: ListarIngredientesQuery) {
  const where = fornecedorId === undefined ? {} : { fornecedorId };
  const [dados, total] = await prisma.$transaction([
    prisma.ingrediente.findMany({
      where,
      include: comFornecedor,
      orderBy: [{ nome: "asc" }, { id: "asc" }],
      ...recorte(pagina),
    }),
    prisma.ingrediente.count({ where }),
  ]);
  return paginar(dados, total, pagina);
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
  await removerOuExplicar(
    () => prisma.ingrediente.delete({ where: { id } }),
    "Ingrediente usado na ficha técnica de algum produto não pode ser removido. Retire-o das fichas técnicas antes.",
  );
}
