import { Prisma } from "@prisma/client";
import { calcularDesconto } from "./desconto.js";

interface PromocaoAplicavel {
  id: number;
  nome: string;
  tipoDesconto: string;
  valorDesconto: Prisma.Decimal;
}

/**
 * Preço de um produto com a MELHOR promoção vigente (promoções não
 * acumulam: vale a que der o menor preço). Usado no registro do pedido e
 * para mostrar o preço do dia no cardápio — os dois precisam bater.
 */
export function melhorPreco<P extends PromocaoAplicavel>(
  preco: Prisma.Decimal,
  promocoesVigentes: P[],
): { preco: Prisma.Decimal; promocao: P | null } {
  let melhor = { preco, promocao: null as P | null };
  for (const promocao of promocoesVigentes) {
    const comPromocao = preco.minus(calcularDesconto(preco, promocao));
    if (comPromocao.lessThan(melhor.preco)) {
      melhor = { preco: comPromocao, promocao };
    }
  }
  return melhor;
}
