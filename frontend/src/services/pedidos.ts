import { api } from "./api";
import type { ConsultaPaginada, Paginado } from "../types/api";
import type {
  LinhaConsumoIngrediente,
  LinhaMaisVendidos,
  LinhaVendasPorAtendente,
  NovoPedido,
  Pedido,
  StatusPedido,
} from "../types/dominio";

export interface FiltrosDePedido extends ConsultaPaginada {
  status?: StatusPedido;
  clienteId?: number;
  /** AAAA-MM-DD */
  dataInicio?: string;
  /** AAAA-MM-DD */
  dataFim?: string;
}

export const pedidos = {
  listar: (filtros: FiltrosDePedido = {}, sinal?: AbortSignal) =>
    api.get<Paginado<Pedido>>("/pedidos", { consulta: { ...filtros }, sinal }),
  /** Histórico de pedidos de um cliente (mesmos filtros). */
  listarDoCliente: (
    clienteId: number,
    filtros: Omit<FiltrosDePedido, "clienteId"> = {},
    sinal?: AbortSignal,
  ) =>
    api.get<Paginado<Pedido>>(`/clientes/${clienteId}/pedidos`, {
      consulta: { ...filtros },
      sinal,
    }),
  buscar: (id: number, sinal?: AbortSignal) =>
    api.get<Pedido>(`/pedidos/${id}`, { sinal }),
  criar: (dados: NovoPedido) => api.post<Pedido>("/pedidos", dados),
  mudarStatus: (id: number, status: StatusPedido) =>
    api.post<Pedido>(`/pedidos/${id}/status`, { status }),
  pagar: (id: number, formaPagamentoId: number, valorPago: number) =>
    api.post<Pedido>(`/pedidos/${id}/pagamentos`, {
      formaPagamentoId,
      valorPago,
    }),
  /** `null` retira o entregador (enquanto o pedido não saiu). */
  definirEntregador: (id: number, entregadorId: number | null) =>
    api.patch<Pedido>(`/pedidos/${id}/entrega`, { entregadorId }),
  avaliar: (id: number, nota: number, comentario?: string) =>
    api.post<Pedido>(`/pedidos/${id}/avaliacao`, { nota, comentario }),
};

/** Período em AAAA-MM-DD (as duas datas são obrigatórias). */
interface Periodo {
  dataInicio: string;
  dataFim: string;
}

export const relatorios = {
  maisVendidos: (periodo: Periodo & { limite?: number }, sinal?: AbortSignal) =>
    api.get<LinhaMaisVendidos[]>("/relatorios/mais-vendidos", {
      consulta: { ...periodo },
      sinal,
    }),
  consumoIngredientes: (periodo: Periodo, sinal?: AbortSignal) =>
    api.get<LinhaConsumoIngrediente[]>("/relatorios/consumo-ingredientes", {
      consulta: { ...periodo },
      sinal,
    }),
  vendasPorAtendente: (periodo: Periodo, sinal?: AbortSignal) =>
    api.get<LinhaVendasPorAtendente[]>("/relatorios/vendas-por-atendente", {
      consulta: { ...periodo },
      sinal,
    }),
};
