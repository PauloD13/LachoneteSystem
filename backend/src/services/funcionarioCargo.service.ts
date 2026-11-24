import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { CARGO } from "../lib/cargos.js";
import { hojeComoData } from "../lib/datas.js";

const diaPorExtenso = (dia: Date) => dia.toISOString().slice(0, 10);

export async function abrir(
  funcionarioId: number,
  cargoId: number,
  dataInicio: Date = hojeComoData(),
) {
  // Funcionário é o recurso da URL (/funcionarios/:id/cargos): se não existe,
  // é 404. Cargo vem no corpo: se não existe, o dado enviado é que está
  // errado, 400.
  const funcionario = await prisma.funcionario.findUniqueOrThrow({
    where: { id: funcionarioId },
    select: { ativo: true },
  });
  if (!funcionario.ativo) {
    throw new AppError(409, "Funcionário desativado não pode receber um novo cargo.");
  }
  const cargo = await prisma.cargo.findUnique({
    where: { id: cargoId },
    select: { id: true },
  });
  if (!cargo) {
    throw new AppError(400, `Cargo ${cargoId} não existe.`);
  }

  // Se já existir um vínculo aberto do mesmo cargo pra esse funcionário, o
  // índice único parcial ux_funcionario_cargo_aberto (ver
  // database/init/001_schema.sql) faz o Postgres rejeitar — o Prisma já
  // lança P2002 e o errorHandler já sabe tratar. Não precisa checar aqui
  // (e uma checagem aqui não protegeria contra duas requisições simultâneas).
  return prisma.funcionarioCargo.create({
    data: { funcionarioId, cargoId, dataInicio },
    include: { cargo: true },
  });
}

export async function listarPorFuncionario(funcionarioId: number) {
  // Sem esta linha, um funcionário inexistente responderia "200 []", que o
  // cliente da API não distingue de "existe, mas nunca teve cargo".
  await prisma.funcionario.findUniqueOrThrow({
    where: { id: funcionarioId },
    select: { id: true },
  });
  return prisma.funcionarioCargo.findMany({
    where: { funcionarioId },
    include: { cargo: true },
    orderBy: [{ dataInicio: "desc" }, { id: "desc" }],
  });
}

export async function encerrar(
  funcionarioId: number,
  vinculoId: number,
  dataFim: Date = hojeComoData(),
  autorId: number,
) {
  return prisma.$transaction(async (tx) => {
    // FOR UPDATE: trava a linha do vínculo até o fim da transação, para que
    // dois encerramentos simultâneos não passem ambos pela checagem abaixo.
    await tx.$queryRaw`SELECT id FROM funcionario_cargo WHERE id = ${vinculoId} FOR UPDATE`;

    // where combinado (id + funcionarioId): só encontra o vínculo se ele
    // realmente pertencer a esse funcionário. Um vinculoId de outro
    // funcionário na URL resulta em 404, em vez de encerrar o vínculo errado.
    const vinculo = await tx.funcionarioCargo.findUniqueOrThrow({
      where: { id: vinculoId, funcionarioId },
      include: { cargo: true },
    });

    // Vínculo encerrado é histórico: "encerrar de novo" sobrescreveria a
    // data em que o cargo realmente terminou.
    if (vinculo.dataFim !== null) {
      throw new AppError(
        409,
        `Este vínculo já foi encerrado em ${diaPorExtenso(vinculo.dataFim)}.`,
      );
    }
    if (dataFim < vinculo.dataInicio) {
      throw new AppError(
        400,
        `dataFim não pode ser anterior ao início do vínculo (${diaPorExtenso(vinculo.dataInicio)}).`,
      );
    }
    // Mesma proteção de funcionario.service: um gerente não tira o próprio
    // cargo de gerente, então sempre resta alguém capaz de administrar.
    if (funcionarioId === autorId && vinculo.cargo.nome === CARGO.GERENTE) {
      throw new AppError(
        409,
        "Você não pode encerrar o seu próprio cargo de gerente. Peça a outro gerente.",
      );
    }

    return tx.funcionarioCargo.update({
      where: { id: vinculoId },
      data: { dataFim },
      include: { cargo: true },
    });
  });
}
