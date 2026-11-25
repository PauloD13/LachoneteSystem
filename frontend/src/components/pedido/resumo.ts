// Textos curtos de um pedido, usados em listas e comandas.

import { ROTULO_CANAL } from "../../lib/rotulos";
import type { Pedido } from "../../types/dominio";

/** "Mesa 7", "Retirada", "Entrega · Centro". */
export function ondeDoPedido(pedido: Pedido): string {
  if (pedido.mesa) return `Mesa ${pedido.mesa.numero}`;
  if (pedido.entrega) return `Entrega · ${pedido.entrega.endereco.bairro}`;
  return "Retirada";
}

/** "Balcão · Mesa 7" (origem + onde), como na comanda da cozinha. */
export function origemDoPedido(pedido: Pedido): string {
  return `${ROTULO_CANAL[pedido.canal]} · ${ondeDoPedido(pedido)}`;
}

/** "2× X-Bacon, 1× Fritas média". */
export function itensEmTexto(pedido: Pick<Pedido, "itens">): string {
  return pedido.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(", ");
}

/** Nome do item com a variação: "X-Bacon · Duplo". */
export function nomeDoItem(item: Pedido["itens"][number]): string {
  return item.variacao ? `${item.nome} · ${item.variacao.nome}` : item.nome;
}

/** Adicionais em texto: "+ bacon, + queijo". */
export function adicionaisEmTexto(item: Pedido["itens"][number]): string {
  return item.adicionais.map((a) => `+ ${a.nome}`).join(" · ");
}
