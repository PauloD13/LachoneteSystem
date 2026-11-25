import { createContext } from "react";
import type { Canal, Endereco, TipoAtendimento } from "../types/dominio";

/** Um item escolhido no cardápio, ainda não enviado. */
export interface ItemDoCarrinho {
  /** Identifica a linha (o mesmo produto pode entrar duas vezes, diferente). */
  chave: string;
  itemVendavelId: number;
  nome: string;
  tipo: "PRODUTO" | "COMBO";
  categoriaNome?: string;
  /** Preço do dia (com promoção) — a conta definitiva é do backend. */
  precoBase: number;
  variacao: { id: number; nome: string; precoAdicional: number } | null;
  adicionais: { id: number; nome: string; preco: number }[];
  observacao: string;
  quantidade: number;
}

export interface PagamentoDoCarrinho {
  chave: string;
  formaPagamentoId: number;
  valor: number;
}

export interface ClienteDoCarrinho {
  id: number;
  nome: string;
  telefone: string;
  /** Tem endereço padrão completo (dispensa digitar na entrega)? */
  temEndereco: boolean;
}

export interface Carrinho {
  canal: Canal;
  atendimento: TipoAtendimento;
  mesa: { id: number; numero: number } | null;
  cliente: ClienteDoCarrinho | null;
  itens: ItemDoCarrinho[];
  taxaEntrega: number;
  /** Só quando o cliente não tem endereço padrão (ou é outro endereço). */
  endereco: Endereco | null;
  cupom: string;
  pagamentos: PagamentoDoCarrinho[];
  observacoes: string;
}

export interface ValorDoCarrinho {
  carrinho: Carrinho;
  /** Quantidade total de unidades (para o contador "Ver pedido"). */
  quantidadeTotal: number;
  /** Estimativa local do subtotal dos itens (o fechamento usa a simulação). */
  subtotalEstimado: number;
  alterar(parcial: Partial<Carrinho>): void;
  adicionar(item: Omit<ItemDoCarrinho, "chave">): void;
  atualizarItem(chave: string, item: Partial<ItemDoCarrinho>): void;
  removerItem(chave: string): void;
  limpar(): void;
}

export const CARRINHO_VAZIO: Carrinho = {
  canal: "BALCAO",
  atendimento: "RETIRADA",
  mesa: null,
  cliente: null,
  itens: [],
  taxaEntrega: 0,
  endereco: null,
  cupom: "",
  pagamentos: [],
  observacoes: "",
};

let sequencia = 0;
/** Identificador local de uma linha (item ou pagamento) do carrinho. */
export const novaChave = () =>
  `${Date.now().toString(36)}-${(sequencia++).toString(36)}`;

export const CarrinhoContexto = createContext<ValorDoCarrinho | null>(null);

/** Preço de uma unidade com variação e adicionais. */
export function precoUnitario(item: ItemDoCarrinho): number {
  return (
    item.precoBase +
    (item.variacao?.precoAdicional ?? 0) +
    item.adicionais.reduce((soma, a) => soma + a.preco, 0)
  );
}
