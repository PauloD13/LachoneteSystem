import { prisma } from "../lib/prisma.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import { abertosPorMesa } from "./pedido.service.js";
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
    prisma.mesa.findMany({
      where,
      orderBy: { numero: "asc" },
      ...recorte(pagina),
    }),
    prisma.mesa.count({ where }),
  ]);
  // Cada mesa sai com o pedido em aberto (ou null = livre).
  const abertos = await abertosPorMesa(dados.map((m) => m.id));
  return paginar(
    dados.map((mesa) => ({
      ...mesa,
      pedidoAberto: abertos.get(mesa.id) ?? null,
    })),
    total,
    pagina,
  );
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
