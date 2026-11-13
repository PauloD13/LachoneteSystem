import { prisma } from "../lib/prisma.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type { ListarComAtivoQuery } from "../validators/comum.js";
import type {
  CriarAdicionalDTO,
  AtualizarAdicionalDTO,
} from "../validators/adicional.validator.js";

export async function criar(dados: CriarAdicionalDTO) {
  return prisma.adicional.create({ data: dados });
}

export async function listar({ ativo, ...pagina }: ListarComAtivoQuery) {
  const where = ativo === undefined ? {} : { ativo };
  const [dados, total] = await prisma.$transaction([
    prisma.adicional.findMany({
      where,
      orderBy: [{ nome: "asc" }, { id: "asc" }],
      ...recorte(pagina),
    }),
    prisma.adicional.count({ where }),
  ]);
  return paginar(dados, total, pagina);
}

export async function buscarPorId(id: number) {
  return prisma.adicional.findUniqueOrThrow({ where: { id } });
}

export async function atualizar(id: number, dados: AtualizarAdicionalDTO) {
  return prisma.adicional.update({ where: { id }, data: dados });
}

export async function remover(id: number) {
  await removerOuExplicar(
    () => prisma.adicional.delete({ where: { id } }),
    "Adicional já vendido em pedidos não pode ser removido: desative-o (ativo = false).",
  );
}
