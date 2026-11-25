// Tipos das respostas da API, campo a campo como o backend devolve
// (conferidos contra a API rodando). Quando o backend mudar, mude aqui:
// o TypeScript aponta todas as telas que precisam acompanhar.
//
// Convenção: `Xxx` é o que a API DEVOLVE; `XxxEntrada` é o que se ENVIA
// para criar/alterar (dinheiro vai como número, ids em vez de objetos).

import type { Decimal, Dia, Dinheiro, Instante } from "./api";

// --- Acesso -----------------------------------------------------------------

export type NomeDeCargo = "atendente" | "cozinheiro" | "entregador" | "gerente";

export interface Usuario {
  id: number;
  nome: string;
  /** Cargos que exerce HOJE (cargos criados pelo gerente também aparecem). */
  cargos: string[];
}

export interface RespostaLogin {
  token: string;
  tipo: "Bearer";
  expiraEm: Instante;
  funcionario: Usuario;
}

// --- Cadastros --------------------------------------------------------------

export interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  email: string | null;
  enderecoPadraoLogradouro: string | null;
  enderecoPadraoNumero: string | null;
  enderecoPadraoBairro: string | null;
  enderecoPadraoCidade: string | null;
  enderecoPadraoCep: string | null;
  criadoEm: Instante;
}

export type ClienteEntrada = Omit<Cliente, "id" | "criadoEm">;

export interface Funcionario {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  login: string | null;
  cargos: string[];
}

export interface FuncionarioEntrada {
  nome: string;
  telefone?: string | null;
  email?: string | null;
  ativo?: boolean;
  /** `null` no PATCH remove o acesso ao sistema. */
  login?: string | null;
  senha?: string;
}

export interface Cargo {
  id: number;
  nome: string;
}

/** Período em que um funcionário exerceu (ou exerce) um cargo. */
export interface VinculoCargo {
  id: number;
  funcionarioId: number;
  cargoId: number;
  dataInicio: Dia;
  /** `null` = vínculo em aberto (cargo exercido atualmente). */
  dataFim: Dia | null;
  cargo: Cargo;
}

export interface Mesa {
  id: number;
  numero: number;
  ativa: boolean;
}

export interface FormaPagamento {
  id: number;
  nome: string;
}

// --- Cardápio ---------------------------------------------------------------

export interface Categoria {
  id: number;
  nome: string;
}

export interface Produto {
  id: number;
  nome: string;
  preco: Dinheiro;
  ativo: boolean;
  categoriaId: number;
  categoriaNome: string;
  descricao: string | null;
}

export interface ProdutoEntrada {
  nome: string;
  preco: number;
  categoriaId: number;
  descricao?: string | null;
  ativo?: boolean;
}

export interface Variacao {
  id: number;
  produtoId: number;
  nome: string;
  precoAdicional: Dinheiro;
}

export interface VariacaoEntrada {
  nome: string;
  precoAdicional?: number;
}

/** Uma linha da ficha técnica: quanto de um ingrediente o produto consome. */
export interface ItemFichaTecnica {
  id: number;
  produtoId: number;
  ingredienteId: number;
  quantidadeUtilizada: Decimal;
  ingrediente: { id: number; nome: string; unidadeMedida: UnidadeMedida };
}

export interface Combo {
  id: number;
  nome: string;
  preco: Dinheiro;
  ativo: boolean;
  descricao: string | null;
  itens: {
    produtoId: number;
    nome: string;
    precoIndividual: Dinheiro;
    ativo: boolean;
    quantidade: number;
  }[];
}

export interface ComboEntrada {
  nome: string;
  preco: number;
  descricao?: string | null;
  ativo?: boolean;
  itens: { produtoId: number; quantidade?: number }[];
}

export interface Adicional {
  id: number;
  nome: string;
  preco: Dinheiro;
  ativo: boolean;
}

export interface AdicionalEntrada {
  nome: string;
  preco: number;
  ativo?: boolean;
}

export type TipoDesconto = "VALOR" | "PERCENTUAL";

export interface Promocao {
  id: number;
  nome: string;
  dataInicio: Dia;
  dataFim: Dia;
  tipoDesconto: TipoDesconto;
  valorDesconto: Dinheiro;
  produtos: { id: number; nome: string; precoBase: Dinheiro }[];
}

export interface PromocaoEntrada {
  nome: string;
  /** AAAA-MM-DD */
  dataInicio: string;
  /** AAAA-MM-DD */
  dataFim: string;
  tipoDesconto: TipoDesconto;
  valorDesconto: number;
  produtoIds: number[];
}

export interface Cupom {
  id: number;
  codigo: string;
  tipoDesconto: TipoDesconto;
  valorDesconto: Dinheiro;
  dataInicio: Dia;
  dataFim: Dia;
}

export interface CupomEntrada {
  codigo: string;
  tipoDesconto: TipoDesconto;
  valorDesconto: number;
  /** AAAA-MM-DD */
  dataInicio: string;
  /** AAAA-MM-DD */
  dataFim: string;
}

// --- Estoque ----------------------------------------------------------------

export interface Fornecedor {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
}

export type FornecedorEntrada = Omit<Fornecedor, "id">;

export type UnidadeMedida = "kg" | "litro" | "unidade";

export interface Ingrediente {
  id: number;
  nome: string;
  quantidadeEstoque: Decimal;
  unidadeMedida: UnidadeMedida;
  fornecedorId: number;
  fornecedor: { id: number; nome: string };
}

export interface IngredienteEntrada {
  nome: string;
  quantidadeEstoque?: number;
  unidadeMedida: UnidadeMedida;
  fornecedorId: number;
}

// --- Pedido -----------------------------------------------------------------

export type StatusPedido =
  | "RECEBIDO"
  | "EM_PREPARO"
  | "PRONTO"
  | "SAIU_PARA_ENTREGA"
  | "ENTREGUE_RETIRADO"
  | "CANCELADO";

export type Canal = "BALCAO" | "TELEFONE" | "APP";

export type TipoAtendimento = "ENTREGA" | "CONSUMO_LOCAL" | "RETIRADA";

export interface Endereco {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
}

export interface ItemDoPedido {
  id: number;
  itemVendavelId: number;
  nome: string;
  tipo: "PRODUTO" | "COMBO";
  variacao: { id: number; nome: string } | null;
  quantidade: number;
  precoUnitarioPraticado: Dinheiro;
  observacao: string | null;
  adicionais: { adicionalId: number; nome: string; precoPraticado: Dinheiro }[];
  subtotal: Dinheiro;
}

export interface Pedido {
  id: number;
  dataHora: Instante;
  canal: Canal;
  tipoAtendimento: TipoAtendimento;
  statusAtual: StatusPedido;
  observacoes: string | null;
  cliente: { id: number; nome: string; telefone: string } | null;
  mesa: Mesa | null;
  atendente: { id: number; nome: string };
  cupom: {
    id: number;
    codigo: string;
    tipoDesconto: TipoDesconto;
    valorDesconto: Dinheiro;
  } | null;
  itens: ItemDoPedido[];
  entrega: {
    /** `null` até o entregador ser definido. */
    entregador: { id: number; nome: string } | null;
    endereco: Endereco;
    taxaEntrega: Dinheiro;
    dataHoraSaida: Instante | null;
    dataHoraEntrega: Instante | null;
  } | null;
  pagamentos: {
    id: number;
    formaPagamento: FormaPagamento;
    valorPago: Dinheiro;
    /** Preenchido quando o pedido foi cancelado depois de pago. */
    estornadoEm: Instante | null;
  }[];
  avaliacao: {
    nota: number;
    comentario: string | null;
    dataHora: Instante;
  } | null;
  statusHistorico: { status: StatusPedido; dataHora: Instante }[];
  totais: {
    subtotalItens: Dinheiro;
    descontoCupom: Dinheiro;
    taxaEntrega: Dinheiro;
    total: Dinheiro;
    totalPago: Dinheiro;
    totalEstornado: Dinheiro;
    saldo: Dinheiro;
  };
}

export interface NovoPedido {
  canal: Canal;
  clienteId?: number | null;
  mesaId?: number | null;
  /** Se omitido, o atendente é o funcionário logado. */
  atendenteId?: number;
  cupomCodigo?: string | null;
  observacoes?: string | null;
  itens: {
    itemVendavelId: number;
    quantidade: number;
    variacaoId?: number | null;
    observacao?: string | null;
    adicionalIds?: number[];
  }[];
  entrega?: {
    entregadorId?: number | null;
    taxaEntrega: number;
    /** Se omitido, usa o endereço padrão do cliente. */
    endereco?: Endereco;
  } | null;
  pagamentos?: { formaPagamentoId: number; valorPago: number }[];
}

// --- Relatórios ---------------------------------------------------------------

export interface LinhaMaisVendidos {
  itemVendavelId: number;
  nome: string;
  tipo: "PRODUTO" | "COMBO";
  quantidadeVendida: number;
  receita: Dinheiro;
}

export interface LinhaConsumoIngrediente {
  ingredienteId: number;
  nome: string;
  unidadeMedida: UnidadeMedida;
  consumoEstimado: Decimal;
  quantidadeEstoque: Decimal;
}

export interface LinhaVendasPorAtendente {
  funcionarioId: number;
  nome: string;
  quantidadePedidos: number;
  totalVendido: Dinheiro;
}
