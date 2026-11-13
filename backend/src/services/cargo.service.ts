import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { CARGOS_BASE } from "../lib/cargos.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type { PaginacaoQuery } from "../validators/comum.js";
import type {
  CriarCargoDTO,
  AtualizarCargoDTO,
} from "../validators/cargo.validator.js";

// Os cargos-base (atendente, cozinheiro, entregador, gerente) têm significado
// para o sistema: permissões e validações do pedido dependem do nome deles.
// Renomear "gerente" tiraria o acesso de todos os gerentes de uma vez.
async function recusarSeForCargoBase(id: number) {
  const cargo = await prisma.cargo.findUniqueOrThrow({ where: { id } });
  if (CARGOS_BASE.includes(cargo.nome)) {
    throw new AppError(
      409,
      `O cargo "${cargo.nome}" é usado pelas regras do sistema e não pode ser alterado nem removido.`,
    );
  }
}

export async function criar(dados: CriarCargoDTO) {
  return prisma.cargo.create({
    data: dados,
  });
}

export async function listar(pagina: PaginacaoQuery) {
  const [dados, total] = await prisma.$transaction([
    prisma.cargo.findMany({
      orderBy: [{ nome: "asc" }, { id: "asc" }],
      ...recorte(pagina),
    }),
    prisma.cargo.count(),
  ]);
  return paginar(dados, total, pagina);
}

export async function buscarPorId(id: number) {
  return prisma.cargo.findUniqueOrThrow({
    where: { id },
  });
}

export async function atualizar(id: number, dados: AtualizarCargoDTO) {
  await recusarSeForCargoBase(id);
  return prisma.cargo.update({
    where: { id },
    data: dados,
  });
}

export async function remover(id: number) {
  await recusarSeForCargoBase(id);
  await removerOuExplicar(
    () => prisma.cargo.delete({ where: { id } }),
    "Cargo que já foi exercido por algum funcionário faz parte do histórico e não pode ser removido.",
  );
}
