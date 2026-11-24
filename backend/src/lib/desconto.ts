import { Prisma } from "@prisma/client";
import { AppError } from "./appError.js";

// Regras comuns a Promoção e Cupom (ambos têm tipo/valor de desconto e
// período de validade).

interface RegraDeDesconto {
  tipoDesconto: string;
  valorDesconto: Prisma.Decimal | number;
}

interface Vigencia {
  dataInicio: Date;
  dataFim: Date;
}

// Validação que depende de mais de um campo. Fica no service (e não no Zod)
// porque no PATCH só parte dos campos chega: é preciso validar o resultado
// já mesclado com o que está gravado.
export function validarDescontoEVigencia(dados: RegraDeDesconto & Vigencia) {
  if (dados.dataFim < dados.dataInicio) {
    throw new AppError(400, "dataFim não pode ser anterior a dataInicio.");
  }
  if (
    dados.tipoDesconto === "PERCENTUAL" &&
    new Prisma.Decimal(dados.valorDesconto).greaterThan(100)
  ) {
    throw new AppError(400, "Desconto percentual não pode passar de 100.");
  }
}

export function estaVigente(vigencia: Vigencia, dia: Date): boolean {
  return vigencia.dataInicio <= dia && dia <= vigencia.dataFim;
}

/** Valor do desconto sobre uma base, nunca maior que a própria base. */
export function calcularDesconto(
  base: Prisma.Decimal,
  regra: RegraDeDesconto,
): Prisma.Decimal {
  const valor = new Prisma.Decimal(regra.valorDesconto);
  const desconto =
    regra.tipoDesconto === "PERCENTUAL" ? base.mul(valor).div(100) : valor;
  return Prisma.Decimal.min(desconto, base).toDecimalPlaces(2);
}
