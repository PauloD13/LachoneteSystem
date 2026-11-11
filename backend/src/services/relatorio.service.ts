import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { inicioDoDia, somarDias } from "../lib/datas.js";

// Relatórios são agregações com junções entre várias tabelas — mais claro e
// eficiente em SQL direto do que montando objetos em memória. Todos os
// valores entram como parâmetros (Prisma.sql), nunca concatenados.
//
// Pedidos cancelados ficam de fora. Como CANCELADO é um status final, "não
// está cancelado" equivale a "não existe linha CANCELADO no histórico".

function filtroDoPeriodo(dataInicio: Date, dataFim: Date) {
  const desde = inicioDoDia(dataInicio).toISOString();
  const ate = inicioDoDia(somarDias(dataFim, 1)).toISOString();
  return Prisma.sql`
    p.data_hora >= ${desde}::timestamp
    AND p.data_hora < ${ate}::timestamp
    AND NOT EXISTS (
      SELECT 1 FROM status_pedido_historico s
      WHERE s.pedido_id = p.id AND s.status = 'CANCELADO'
    )`;
}

// Regra do contexto: "ninguém sabe ao certo quais produtos venderam mais em
// cada período". Ranqueia itens do cardápio (produtos e combos) pela
// quantidade vendida.
export async function maisVendidos(
  dataInicio: Date,
  dataFim: Date,
  limite: number,
) {
  return prisma.$queryRaw`
    SELECT
      iv.id                                              AS "itemVendavelId",
      iv.nome,
      iv.tipo,
      SUM(ip.quantidade)::int                            AS "quantidadeVendida",
      SUM(ip.quantidade * ip.preco_unitario_praticado)::numeric(14,2)::text
                                                         AS "receita"
    FROM item_pedido ip
    JOIN pedido p         ON p.id = ip.pedido_id
    JOIN item_vendavel iv ON iv.id = ip.item_vendavel_id
    WHERE ${filtroDoPeriodo(dataInicio, dataFim)}
    GROUP BY iv.id, iv.nome, iv.tipo
    ORDER BY "quantidadeVendida" DESC, iv.nome ASC
    LIMIT ${limite}`;
}

// Regra 4.6: estimar quanto de cada ingrediente foi consumido, a partir da
// ficha técnica (produto_ingrediente). Produtos vendidos dentro de combos
// também contam (quantidade do item x quantidade do produto no combo).
//
// É uma estimativa: usa a ficha técnica e a composição dos combos como estão
// hoje, não como eram na data de cada venda.
export async function consumoIngredientes(dataInicio: Date, dataFim: Date) {
  return prisma.$queryRaw`
    WITH produtos_vendidos AS (
      SELECT ip.pedido_id, ip.item_vendavel_id AS produto_id, ip.quantidade
      FROM item_pedido ip
      JOIN produto pr ON pr.id = ip.item_vendavel_id
      UNION ALL
      SELECT ip.pedido_id, ci.produto_id, ip.quantidade * ci.quantidade
      FROM item_pedido ip
      JOIN combo_item ci ON ci.combo_id = ip.item_vendavel_id
    )
    SELECT
      i.id                                   AS "ingredienteId",
      i.nome,
      i.unidade_medida                       AS "unidadeMedida",
      SUM(pv.quantidade * pi.quantidade_utilizada)::numeric(14,3)::text
                                             AS "consumoEstimado",
      i.quantidade_estoque::text             AS "quantidadeEstoque"
    FROM produtos_vendidos pv
    JOIN pedido p               ON p.id = pv.pedido_id
    JOIN produto_ingrediente pi ON pi.produto_id = pv.produto_id
    JOIN ingrediente i          ON i.id = pi.ingrediente_id
    WHERE ${filtroDoPeriodo(dataInicio, dataFim)}
    GROUP BY i.id, i.nome, i.unidade_medida, i.quantidade_estoque
    ORDER BY i.nome ASC`;
}

// Regra 4.5: cada pedido registra o atendente "para calcular comissões no fim
// do mês". Total vendido em itens (com adicionais) por atendente.
export async function vendasPorAtendente(dataInicio: Date, dataFim: Date) {
  return prisma.$queryRaw`
    SELECT
      f.id                                   AS "funcionarioId",
      f.nome,
      COUNT(DISTINCT p.id)::int              AS "quantidadePedidos",
      SUM(ip.quantidade * (ip.preco_unitario_praticado + COALESCE(ad.total, 0)))
        ::numeric(14,2)::text                AS "totalVendido"
    FROM pedido p
    JOIN funcionario f  ON f.id = p.atendente_id
    JOIN item_pedido ip ON ip.pedido_id = p.id
    LEFT JOIN LATERAL (
      SELECT SUM(a.preco_praticado) AS total
      FROM item_pedido_adicional a
      WHERE a.item_pedido_id = ip.id
    ) ad ON TRUE
    WHERE ${filtroDoPeriodo(dataInicio, dataFim)}
    GROUP BY f.id, f.nome
    ORDER BY SUM(ip.quantidade * (ip.preco_unitario_praticado + COALESCE(ad.total, 0))) DESC,
             f.nome ASC`;
}
