import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import { AppError } from "../lib/appError.js";
import * as pedidoService from "./pedido.service.js";
import { listarPedidosQuerySchema } from "../validators/pedido.validator.js";
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

// Cliente anonimizado (LGPD) não aparece mais na busca: só nos pedidos
// antigos, como "Cliente anonimizado".
export async function listar({ busca, ...pagina }: ListarClientesQuery) {
  const where: Prisma.ClienteWhereInput = {
    anonimizadoEm: null,
    ...(busca
      ? {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            { telefone: { contains: busca } },
            { email: { contains: busca, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [dados, total] = await prisma.$transaction([
    prisma.cliente.findMany({
      where,
      orderBy: [{ nome: "asc" }, { id: "asc" }],
      include: {
        _count: { select: { pedidos: { where: VALIDOS } } },
        pedidos: {
          select: { dataHora: true },
          orderBy: { dataHora: "desc" },
          take: 1,
        },
      },
      ...recorte(pagina),
    }),
    prisma.cliente.count({ where }),
  ]);
  return paginar(
    dados.map(({ _count, pedidos, ...cliente }) => ({
      ...cliente,
      totalPedidos: _count.pedidos,
      ultimoPedidoEm: pedidos[0]?.dataHora ?? null,
    })),
    total,
    pagina,
  );
}

// Pedidos cancelados não contam no histórico de consumo do cliente.
const VALIDOS = {
  statusAtual: { not: "CANCELADO" },
} satisfies Prisma.PedidoWhereInput;

interface LinhaResumo {
  totalPedidos: number;
  totalGasto: string | null;
  notaMedia: string | null;
}

// Total de cada pedido = itens (com adicionais) - cupom + taxa de entrega,
// a mesma conta de pedido.service (calcularTotais), feita em SQL para não
// carregar todos os pedidos do cliente só para somar.
async function resumoDoCliente(id: number) {
  const [linha] = await prisma.$queryRaw<LinhaResumo[]>`
    WITH itens AS (
      SELECT ip.pedido_id,
             SUM(ip.quantidade * (ip.preco_unitario_praticado
                 + COALESCE((SELECT SUM(a.preco_praticado)
                             FROM item_pedido_adicional a
                             WHERE a.item_pedido_id = ip.id), 0))) AS subtotal
      FROM item_pedido ip
      JOIN pedido p ON p.id = ip.pedido_id
      WHERE p.cliente_id = ${id} AND p.status_atual <> 'CANCELADO'
      GROUP BY ip.pedido_id
    ),
    totais AS (
      SELECT p.id,
             i.subtotal
             - CASE
                 WHEN c.id IS NULL THEN 0
                 -- (LEAST ignora NULL: por isso o CASE de fora)
                 ELSE LEAST(
                   CASE c.tipo_desconto
                     WHEN 'PERCENTUAL' THEN ROUND(i.subtotal * c.valor_desconto / 100, 2)
                     ELSE c.valor_desconto
                   END, i.subtotal)
               END
             + COALESCE(e.taxa_entrega, 0) AS total
      FROM pedido p
      JOIN itens i        ON i.pedido_id = p.id
      LEFT JOIN cupom c   ON c.id = p.cupom_id
      LEFT JOIN entrega e ON e.pedido_id = p.id
    )
    SELECT
      (SELECT COUNT(*) FROM totais)::int                       AS "totalPedidos",
      (SELECT SUM(total) FROM totais)::numeric(14,2)::text      AS "totalGasto",
      (SELECT AVG(av.nota) FROM avaliacao_pedido av
         JOIN pedido p ON p.id = av.pedido_id
        WHERE p.cliente_id = ${id})::numeric(3,1)::text         AS "notaMedia"`;
  const totalGasto = new Prisma.Decimal(linha?.totalGasto ?? 0);
  const totalPedidos = linha?.totalPedidos ?? 0;
  return {
    totalPedidos,
    totalGasto: totalGasto.toFixed(2),
    ticketMedio:
      totalPedidos > 0 ? totalGasto.div(totalPedidos).toFixed(2) : null,
    notaMedia: linha?.notaMedia ?? null,
  };
}

// O detalhe traz o resumo de consumo (tela "ficha do cliente").
export async function buscarPorId(id: number) {
  const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id } });
  return { ...cliente, resumo: await resumoDoCliente(id) };
}

async function exigirNaoAnonimizado(id: number) {
  const cliente = await prisma.cliente.findUniqueOrThrow({
    where: { id },
    select: { anonimizadoEm: true },
  });
  if (cliente.anonimizadoEm) {
    throw new AppError(
      409,
      "Cliente anonimizado: os dados pessoais foram apagados a pedido dele.",
    );
  }
}

export async function atualizar(id: number, dados: AtualizarClienteDTO) {
  await exigirNaoAnonimizado(id);
  return prisma.cliente.update({
    where: { id },
    data: dados,
  });
}

export async function remover(id: number) {
  await removerOuExplicar(
    () => prisma.cliente.delete({ where: { id } }),
    "Cliente com pedidos registrados não pode ser removido: o histórico de pedidos depende do cadastro. Use a anonimização (LGPD), que apaga os dados pessoais e mantém os pedidos.",
  );
}

// -----------------------------------------------------------------------------
// LGPD: direitos do titular (art. 18)
// -----------------------------------------------------------------------------

const STATUS_FINAIS = ["ENTREGUE_RETIRADO", "CANCELADO"];

/**
 * Acesso e portabilidade (art. 18, II e V): tudo o que o sistema guarda sobre
 * o cliente, num arquivo só. Os pedidos vêm completos, como na API.
 */
export async function exportarDados(id: number) {
  const { resumo: _resumo, ...cadastro } = await buscarPorId(id);
  const pedidos = [];
  for (let pagina = 1; ; pagina++) {
    const lote = await pedidoService.listar(
      listarPedidosQuerySchema.parse({
        clienteId: id,
        pagina,
        tamanhoPagina: 100,
        ordem: "antigos",
      }),
    );
    pedidos.push(...lote.dados);
    if (pagina >= lote.paginacao.totalPaginas) break;
  }
  return {
    geradoEm: new Date(),
    controlador: "Lanchonete Sabor & Cia",
    finalidade: "Cópia dos dados pessoais do cliente (LGPD, art. 18, II e V).",
    cliente: cadastro,
    pedidos,
  };
}

/**
 * Eliminação (art. 18, IV e VI) de quem já tem pedidos: os pedidos precisam
 * ficar (registro de vendas e caixa), então os dados que identificam a
 * pessoa são apagados no lugar. Somem nome, telefone, e-mail e endereço do
 * cadastro; dos pedidos dele, rua, número e CEP da entrega, as observações e
 * os comentários das avaliações. Ficam bairro e cidade (sozinhos não
 * identificam ninguém), itens, valores e datas.
 */
export async function anonimizar(id: number) {
  await prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findUniqueOrThrow({ where: { id } });
    if (cliente.anonimizadoEm) return;
    const emAberto = await tx.pedido.count({
      where: { clienteId: id, statusAtual: { notIn: STATUS_FINAIS } },
    });
    if (emAberto > 0) {
      throw new AppError(
        409,
        "O cliente tem pedido em andamento: conclua ou cancele antes de anonimizar.",
      );
    }
    await tx.cliente.update({
      where: { id },
      data: {
        nome: "Cliente anonimizado",
        telefone: "",
        email: null,
        enderecoPadraoLogradouro: null,
        enderecoPadraoNumero: null,
        enderecoPadraoBairro: null,
        enderecoPadraoCidade: null,
        enderecoPadraoCep: null,
        anonimizadoEm: new Date(),
      },
    });
    await tx.pedido.updateMany({
      where: { clienteId: id },
      data: { observacoes: null },
    });
    await tx.entrega.updateMany({
      where: { pedido: { clienteId: id } },
      data: {
        enderecoLogradouro: "anonimizado",
        enderecoNumero: "-",
        enderecoCep: "-",
      },
    });
    await tx.avaliacaoPedido.updateMany({
      where: { pedido: { clienteId: id } },
      data: { comentario: null },
    });
  });
  return buscarPorId(id);
}
