import { prisma } from "../lib/prisma.js";

export async function abrir(
  funcionarioId: number,
  cargoId: number,
  dataInicio: Date,
) {
  // Se já existir um vínculo aberto do mesmo cargo pra esse funcionário, o
  // índice único parcial ux_funcionario_cargo_aberto (ver
  // database/init/001_schema.sql) faz o Postgres rejeitar — o Prisma já
  // lança P2002 e o errorHandler já sabe tratar. Não precisa checar aqui.
  return prisma.funcionarioCargo.create({
    data: { funcionarioId, cargoId, dataInicio },
  });
}

export async function listarPorFuncionario(funcionarioId: number) {
  return prisma.funcionarioCargo.findMany({
    where: { funcionarioId },
    include: { cargo: true },
    orderBy: { dataInicio: "desc" },
  });
}

export async function encerrar(
  funcionarioId: number,
  vinculoId: number,
  dataFim: Date,
) {
  // where combinado (id + funcionarioId): só encerra se o vínculo pedido
  // realmente pertencer a esse funcionário. Se alguém passar um vinculoId
  // de outro funcionário na URL, nenhuma linha bate as duas condições e o
  // Prisma lança P2025 (-> 404), em vez de encerrar o vínculo errado.
  return prisma.funcionarioCargo.update({
    where: { id: vinculoId, funcionarioId },
    data: { dataFim },
  });
}
