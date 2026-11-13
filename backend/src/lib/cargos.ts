import type { Prisma } from "@prisma/client";
import { hojeComoData } from "./datas.js";

// Os quatro cargos do enunciado (regra 4.5), criados por
// database/init/002_seed.sql. A aplicação depende do NOME deles para decidir
// permissões e para validar quem pode ser atendente/entregador de um pedido —
// por isso a API não deixa renomeá-los nem removê-los (ver cargo.service.ts).
export const CARGO = {
  ATENDENTE: "atendente",
  COZINHEIRO: "cozinheiro",
  ENTREGADOR: "entregador",
  GERENTE: "gerente",
} as const;

export type NomeDeCargo = (typeof CARGO)[keyof typeof CARGO];

export const CARGOS_BASE: readonly string[] = Object.values(CARGO);

/**
 * Filtro "vínculo em vigor no dia": já começou e ainda não terminou.
 * (data_fim é inclusiva: quem encerra o cargo hoje ainda o exerce hoje.)
 */
export function vinculoVigente(
  dia: Date = hojeComoData(),
): Prisma.FuncionarioCargoWhereInput {
  return {
    dataInicio: { lte: dia },
    OR: [{ dataFim: null }, { dataFim: { gte: dia } }],
  };
}
