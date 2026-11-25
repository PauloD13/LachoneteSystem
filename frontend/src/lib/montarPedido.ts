// Converte o carrinho (o que a tela guarda) no corpo de POST /pedidos.

import type { Carrinho } from "../contexts/carrinho-contexto";
import type { NovoPedido } from "../types/dominio";

const centavos = (v: number) => Math.round(v * 100);

/**
 * Ajusta os pagamentos ao total: o que passar do total numa linha de
 * DINHEIRO é troco (fica com o cliente) e não é registrado. Se não houver
 * dinheiro, o excesso fica como está (o backend recusa — é erro de digitação).
 */
export function pagamentosSemTroco(
  pagamentos: Carrinho["pagamentos"],
  total: number,
  idDoDinheiro: number | undefined,
): { pagamentos: Carrinho["pagamentos"]; troco: number } {
  const soma = pagamentos.reduce((s, p) => s + centavos(p.valor), 0);
  let excesso = soma - centavos(total);
  if (excesso <= 0 || idDoDinheiro === undefined)
    return { pagamentos, troco: 0 };
  let troco = 0;
  const ajustados = pagamentos.map((p) => {
    if (excesso <= 0 || p.formaPagamentoId !== idDoDinheiro) return p;
    const tirar = Math.min(excesso, centavos(p.valor));
    excesso -= tirar;
    troco += tirar;
    return { ...p, valor: (centavos(p.valor) - tirar) / 100 };
  });
  return {
    pagamentos: ajustados.filter((p) => p.valor > 0),
    troco: troco / 100,
  };
}

export function montarPedido(
  carrinho: Carrinho,
  pagamentos: Carrinho["pagamentos"] = carrinho.pagamentos,
): NovoPedido {
  const entrega = carrinho.atendimento === "ENTREGA";
  return {
    canal: carrinho.canal,
    clienteId: carrinho.cliente?.id ?? null,
    mesaId:
      carrinho.atendimento === "CONSUMO_LOCAL"
        ? (carrinho.mesa?.id ?? null)
        : null,
    cupomCodigo: carrinho.cupom.trim()
      ? carrinho.cupom.trim().toUpperCase()
      : null,
    observacoes: carrinho.observacoes.trim() || null,
    itens: carrinho.itens.map((i) => ({
      itemVendavelId: i.itemVendavelId,
      quantidade: i.quantidade,
      variacaoId: i.variacao?.id ?? null,
      observacao: i.observacao.trim() || null,
      adicionalIds: i.adicionais.map((a) => a.id),
    })),
    entrega: entrega
      ? {
          taxaEntrega: carrinho.taxaEntrega,
          ...(carrinho.endereco ? { endereco: carrinho.endereco } : {}),
        }
      : null,
    pagamentos: pagamentos
      .filter((p) => p.valor > 0)
      .map((p) => ({
        formaPagamentoId: p.formaPagamentoId,
        valorPago: p.valor,
      })),
  };
}
