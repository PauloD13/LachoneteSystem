import { prisma } from "../lib/prisma.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type { PaginacaoQuery } from "../validators/comum.js";
import type {
  CriarFormaPagamentoDTO,
  AtualizarFormaPagamentoDTO,
} from "../validators/formaPagamento.validator.js";

export async function criar(dados: CriarFormaPagamentoDTO) {
  return prisma.formaPagamento.create({ data: dados });
}

export async function listar(pagina: PaginacaoQuery) {
  const [dados, total] = await prisma.$transaction([
    prisma.formaPagamento.findMany({
      orderBy: [{ nome: "asc" }, { id: "asc" }],
      ...recorte(pagina),
    }),
    prisma.formaPagamento.count(),
  ]);
  return paginar(dados, total, pagina);
}

export async function buscarPorId(id: number) {
  return prisma.formaPagamento.findUniqueOrThrow({ where: { id } });
}

export async function atualizar(id: number, dados: AtualizarFormaPagamentoDTO) {
  return prisma.formaPagamento.update({ where: { id }, data: dados });
}

export async function remover(id: number) {
  await removerOuExplicar(
    () => prisma.formaPagamento.delete({ where: { id } }),
    "Forma de pagamento já utilizada em pedidos não pode ser removida.",
  );
}
