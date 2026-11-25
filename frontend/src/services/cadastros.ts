// Um serviço por cadastro da API. Uso nas telas:
//   const pagina = await clientes.listar({ busca: "ana", pagina: 2 });
//   await produtos.atualizar(7, { ativo: false });

import { api } from "./api";
import { criarRecurso } from "./recurso";
import type { ConsultaPaginada } from "../types/api";
import type {
  Adicional,
  AdicionalEntrada,
  Cargo,
  Categoria,
  Cliente,
  ClienteEntrada,
  Combo,
  ComboEntrada,
  Cupom,
  CupomEntrada,
  FormaPagamento,
  Fornecedor,
  FornecedorEntrada,
  Funcionario,
  FuncionarioEntrada,
  Ingrediente,
  IngredienteEntrada,
  ItemFichaTecnica,
  Mesa,
  Produto,
  ProdutoEntrada,
  Promocao,
  PromocaoEntrada,
  Variacao,
  VariacaoEntrada,
  VinculoCargo,
} from "../types/dominio";

type ComAtivo = ConsultaPaginada & { ativo?: boolean };

export const clientes = criarRecurso<
  Cliente,
  ClienteEntrada,
  ConsultaPaginada & { busca?: string }
>("/clientes");

export const funcionarios = criarRecurso<
  Funcionario,
  FuncionarioEntrada,
  ComAtivo & { cargo?: string }
>("/funcionarios");

export const cargos = criarRecurso<Cargo, { nome: string }>("/cargos");
export const mesas = criarRecurso<
  Mesa,
  { numero: number; ativa?: boolean },
  ConsultaPaginada & { ativa?: boolean }
>("/mesas");
export const formasPagamento = criarRecurso<FormaPagamento, { nome: string }>(
  "/formas-pagamento",
);

export const categorias = criarRecurso<Categoria, { nome: string }>(
  "/categorias",
);
export const produtos = criarRecurso<
  Produto,
  ProdutoEntrada,
  ComAtivo & { categoriaId?: number }
>("/produtos");
export const combos = criarRecurso<Combo, ComboEntrada, ComAtivo>("/combos");
export const adicionais = criarRecurso<Adicional, AdicionalEntrada, ComAtivo>(
  "/adicionais",
);
export const promocoes = criarRecurso<
  Promocao,
  PromocaoEntrada,
  ConsultaPaginada & { ativaEm?: string }
>("/promocoes");
export const cupons = criarRecurso<Cupom, CupomEntrada>("/cupons");

export const fornecedores = criarRecurso<Fornecedor, FornecedorEntrada>(
  "/fornecedores",
);
export const ingredientes = criarRecurso<
  Ingrediente,
  IngredienteEntrada,
  ConsultaPaginada & { fornecedorId?: number }
>("/ingredientes");

// --- Sub-recursos (listas pequenas, sem paginação) -----------------------------

/** /produtos/:produtoId/variacoes */
export const variacoes = {
  listar: (produtoId: number, sinal?: AbortSignal) =>
    api.get<Variacao[]>(`/produtos/${produtoId}/variacoes`, { sinal }),
  criar: (produtoId: number, dados: VariacaoEntrada) =>
    api.post<Variacao>(`/produtos/${produtoId}/variacoes`, dados),
  atualizar: (
    produtoId: number,
    variacaoId: number,
    dados: Partial<VariacaoEntrada>,
  ) =>
    api.patch<Variacao>(
      `/produtos/${produtoId}/variacoes/${variacaoId}`,
      dados,
    ),
  remover: (produtoId: number, variacaoId: number) =>
    api.delete(`/produtos/${produtoId}/variacoes/${variacaoId}`),
};

/** /produtos/:produtoId/ingredientes (ficha técnica) */
export const fichaTecnica = {
  listar: (produtoId: number, sinal?: AbortSignal) =>
    api.get<ItemFichaTecnica[]>(`/produtos/${produtoId}/ingredientes`, {
      sinal,
    }),
  /** Inclui o ingrediente na ficha ou atualiza a quantidade. */
  definir: (
    produtoId: number,
    ingredienteId: number,
    quantidadeUtilizada: number,
  ) =>
    api.put<ItemFichaTecnica>(
      `/produtos/${produtoId}/ingredientes/${ingredienteId}`,
      { quantidadeUtilizada },
    ),
  remover: (produtoId: number, ingredienteId: number) =>
    api.delete(`/produtos/${produtoId}/ingredientes/${ingredienteId}`),
};

/** /funcionarios/:funcionarioId/cargos (histórico de cargos) */
export const vinculosDeCargo = {
  listar: (funcionarioId: number, sinal?: AbortSignal) =>
    api.get<VinculoCargo[]>(`/funcionarios/${funcionarioId}/cargos`, {
      sinal,
    }),
  /** dataInicio em AAAA-MM-DD; se omitida, começa hoje. */
  abrir: (funcionarioId: number, cargoId: number, dataInicio?: string) =>
    api.post<VinculoCargo>(`/funcionarios/${funcionarioId}/cargos`, {
      cargoId,
      dataInicio,
    }),
  /** dataFim em AAAA-MM-DD; se omitida, termina hoje. */
  encerrar: (funcionarioId: number, vinculoId: number, dataFim?: string) =>
    api.patch<VinculoCargo>(
      `/funcionarios/${funcionarioId}/cargos/${vinculoId}`,
      { dataFim },
    ),
};
