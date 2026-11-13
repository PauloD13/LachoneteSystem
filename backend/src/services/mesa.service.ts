import { prisma } from "../lib/prisma.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type {
  CriarMesaDTO,
  AtualizarMesaDTO,
  ListarMesasQuery,
} from "../validators/mesa.validator.js";

export async function criar(dados: CriarMesaDTO) {
  return prisma.mesa.create({ data: dados });
}

export async function listar({ ativa, ...pagina }: ListarMesasQuery) {
  const where = ativa === undefined ? {} : { ativa };
  const [dados, total] = await prisma.$transaction([
    prisma.mesa.findMany({ where, orderBy: { numero: "asc" }, ...recorte(pagina) }),
    prisma.mesa.count({ where }),
  ]);
  return paginar(dados, total, pagina);
}

export async function buscarPorId(id: number) {
  return prisma.mesa.findUniqueOrThrow({ where: { id } });
}

export async function atualizar(id: number, dados: AtualizarMesaDTO) {
  return prisma.mesa.update({ where: { id }, data: dados });
}

export async function remover(id: number) {
  await removerOuExplicar(
    () => prisma.mesa.delete({ where: { id } }),
    "Mesa com pedidos registrados não pode ser removida: desative-a (ativa = false).",
  );
}
