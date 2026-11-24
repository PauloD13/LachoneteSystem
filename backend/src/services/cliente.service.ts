import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type {
  CriarClienteDTO,
  AtualizarClienteDTO,
  ListarClientesQuery,
} from "../validators/cliente.validator.js";

export async function criar(dados: CriarClienteDTO) {
  return prisma.cliente.create({
    data: dados,
  });
}

export async function listar({ busca, ...pagina }: ListarClientesQuery) {
  const where: Prisma.ClienteWhereInput = busca
    ? {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { telefone: { contains: busca } },
          { email: { contains: busca, mode: "insensitive" } },
        ],
      }
    : {};

  const [dados, total] = await prisma.$transaction([
    prisma.cliente.findMany({
      where,
      orderBy: [{ nome: "asc" }, { id: "asc" }],
      ...recorte(pagina),
    }),
    prisma.cliente.count({ where }),
  ]);
  return paginar(dados, total, pagina);
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
  await removerOuExplicar(
    () => prisma.cliente.delete({ where: { id } }),
    "Cliente com pedidos registrados não pode ser removido: o histórico de pedidos depende do cadastro.",
  );
}
