// Texto exibido para os códigos que a API usa (enums).

import type {
  Canal,
  StatusPedido,
  TipoAtendimento,
  UnidadeMedida,
} from "../types/dominio";

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  RECEBIDO: "Recebido",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto",
  SAIU_PARA_ENTREGA: "Saiu para entrega",
  ENTREGUE_RETIRADO: "Entregue/retirado",
  CANCELADO: "Cancelado",
};

/** Ordem do fluxo, para colunas de um painel ou filtros. */
export const ORDEM_DOS_STATUS: StatusPedido[] = [
  "RECEBIDO",
  "EM_PREPARO",
  "PRONTO",
  "SAIU_PARA_ENTREGA",
  "ENTREGUE_RETIRADO",
  "CANCELADO",
];

export const ROTULO_CANAL: Record<Canal, string> = {
  BALCAO: "Balcão",
  TELEFONE: "Telefone",
  APP: "App",
};

export const ROTULO_ATENDIMENTO: Record<TipoAtendimento, string> = {
  ENTREGA: "Entrega",
  CONSUMO_LOCAL: "Consumo no local",
  RETIRADA: "Retirada",
};

export const ROTULO_UNIDADE: Record<UnidadeMedida, string> = {
  kg: "kg",
  litro: "litro",
  unidade: "un.",
};

const FORMAS_DE_PAGAMENTO: Record<string, string> = {
  dinheiro: "Dinheiro",
  cartao_debito: "Cartão de débito",
  cartao_credito: "Cartão de crédito",
  pix: "Pix",
  vale_refeicao: "Vale-refeição",
};

/** "cartao_credito" -> "Cartão de crédito" (formas novas aparecem como estão). */
export function rotuloFormaPagamento(nome: string): string {
  return FORMAS_DE_PAGAMENTO[nome] ?? nome;
}
