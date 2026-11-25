// Tudo o que a interface precisa saber sobre o status de um pedido, num
// lugar só: classe de cor (selo e listra da comanda), rótulo e próxima ação.

import type { StatusPedido, TipoAtendimento } from "../types/dominio";

/** Sufixo das classes sc-badge--* e sc-ticket--* do design system. */
const SUFIXO: Record<StatusPedido, string> = {
  RECEBIDO: "recebido",
  EM_PREPARO: "preparo",
  PRONTO: "pronto",
  SAIU_PARA_ENTREGA: "entrega",
  ENTREGUE_RETIRADO: "entregue",
  CANCELADO: "cancelado",
};

export const classeDoSelo = (status: StatusPedido) =>
  `sc-badge sc-badge--${SUFIXO[status]}`;

export const classeDaComanda = (status: StatusPedido) =>
  `sc-ticket sc-ticket--${SUFIXO[status]}`;

/**
 * Rótulo por extenso. ENTREGUE_RETIRADO depende do atendimento: "Entregue"
 * (entrega ou mesa) ou "Retirado" (balcão); sem contexto, os dois.
 */
export function rotuloDoStatus(
  status: StatusPedido,
  tipo?: TipoAtendimento,
): string {
  switch (status) {
    case "RECEBIDO":
      return "Recebido";
    case "EM_PREPARO":
      return "Em preparo";
    case "PRONTO":
      return "Pronto";
    case "SAIU_PARA_ENTREGA":
      return "Saiu para entrega";
    case "CANCELADO":
      return "Cancelado";
    case "ENTREGUE_RETIRADO":
      if (tipo === "RETIRADA") return "Retirado";
      if (tipo) return "Entregue";
      return "Entregue / retirado";
  }
}

/** Status em que o pedido ainda está "em aberto" (não terminou). */
export const STATUS_EM_ABERTO: StatusPedido[] = [
  "RECEBIDO",
  "EM_PREPARO",
  "PRONTO",
  "SAIU_PARA_ENTREGA",
];

export const estaEmAberto = (status: StatusPedido) =>
  STATUS_EM_ABERTO.includes(status);

/**
 * O próximo passo "normal" do pedido e o texto do botão que o executa.
 * Segue as transições do backend: entrega passa por SAIU_PARA_ENTREGA.
 */
export function proximoPasso(
  status: StatusPedido,
  tipo: TipoAtendimento,
): { status: StatusPedido; acao: string; gerundio: string } | null {
  switch (status) {
    case "RECEBIDO":
      return {
        status: "EM_PREPARO",
        acao: "Iniciar preparo",
        gerundio: "Iniciando…",
      };
    case "EM_PREPARO":
      return {
        status: "PRONTO",
        acao: "Marcar como pronto",
        gerundio: "Marcando…",
      };
    case "PRONTO":
      return tipo === "ENTREGA"
        ? {
            status: "SAIU_PARA_ENTREGA",
            acao: "Saiu para entrega",
            gerundio: "Registrando saída…",
          }
        : {
            status: "ENTREGUE_RETIRADO",
            acao:
              tipo === "RETIRADA"
                ? "Marcar como retirado"
                : "Marcar como entregue",
            gerundio: "Registrando…",
          };
    case "SAIU_PARA_ENTREGA":
      return {
        status: "ENTREGUE_RETIRADO",
        acao: "Confirmar entrega",
        gerundio: "Confirmando…",
      };
    default:
      return null;
  }
}
