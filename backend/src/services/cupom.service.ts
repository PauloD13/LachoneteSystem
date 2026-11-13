import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { validarDescontoEVigencia } from "../lib/desconto.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import type { PaginacaoQuery } from "../validators/comum.js";
import type {
  CriarCupomDTO,
  AtualizarCupomDTO,
} from "../validators/cupom.validator.js";

export async function criar(dados: CriarCupomDTO) {
  validarDescontoEVigencia(dados);
  return prisma.cupom.create({ data: dados });
}

export async function listar(pagina: PaginacaoQuery) {
  const [dados, total] = await prisma.$transaction([
    prisma.cupom.findMany({
      orderBy: [{ dataFim: "desc" }, { id: "desc" }],
      ...recorte(pagina),
    }),
    prisma.cupom.count(),
  ]);
  return paginar(dados, total, pagina);
}

export async function buscarPorId(id: number) {
  return prisma.cupom.findUniqueOrThrow({ where: { id } });
}

export async function atualizar(id: number, dados: AtualizarCupomDTO) {
  return prisma.$transaction(async (tx) => {
    const atual = await tx.cupom.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { pedidos: true } } },
    });

    const tipoDesconto = dados.tipoDesconto ?? atual.tipoDesconto;
    const valorDesconto = dados.valorDesconto ?? atual.valorDesconto;
    validarDescontoEVigencia({
      tipoDesconto,
      valorDesconto,
      dataInicio: dados.dataInicio ?? atual.dataInicio,
      dataFim: dados.dataFim ?? atual.dataFim,
    });

    // O pedido guarda só a referência ao cupom; o desconto é recalculado a
    // partir do tipo/valor do cupom. Se esses campos mudassem depois do uso,
    // o total de pedidos antigos mudaria junto — mesma razão do "preço
    // congelado" dos itens (decisão 4 do MER).
    const mudouDesconto =
      tipoDesconto !== atual.tipoDesconto ||
      !new Prisma.Decimal(valorDesconto).equals(atual.valorDesconto);
    if (mudouDesconto && atual._count.pedidos > 0) {
      throw new AppError(
        409,
        "Cupom já utilizado em pedidos: tipo e valor do desconto não podem mais ser alterados.",
      );
    }

    return tx.cupom.update({ where: { id }, data: dados });
  });
}

export async function remover(id: number) {
  await removerOuExplicar(
    () => prisma.cupom.delete({ where: { id } }),
    "Cupom já utilizado em pedidos não pode ser removido. Para tirá-lo de circulação, ajuste a dataFim.",
  );
}
