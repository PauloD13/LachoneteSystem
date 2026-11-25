// Fábrica de serviços CRUD. Quase todo cadastro da API segue o mesmo padrão
// (GET lista paginada, GET /:id, POST, PATCH /:id, DELETE /:id); em vez de
// escrever as mesmas cinco funções para cada um, declara-se o recurso uma
// vez (ver services/cadastros.ts) e todas as telas usam a mesma interface.

import { api } from "./api";
import type { ConsultaPaginada, Paginado } from "../types/api";

type Consulta = ConsultaPaginada &
  Record<string, string | number | boolean | null | undefined>;

/**
 * T = item da listagem; Detalhe = o que GET /:id devolve (por padrão, o
 * mesmo T — alguns recursos trazem mais coisa no detalhe, como o resumo do
 * cliente).
 */
export interface Recurso<
  T,
  Entrada,
  Filtros extends Consulta = Consulta,
  Detalhe = T,
> {
  listar(filtros?: Filtros, sinal?: AbortSignal): Promise<Paginado<T>>;
  buscar(id: number, sinal?: AbortSignal): Promise<Detalhe>;
  criar(dados: Entrada): Promise<Detalhe>;
  atualizar(id: number, dados: Partial<Entrada>): Promise<Detalhe>;
  remover(id: number): Promise<void>;
}

export function criarRecurso<
  T,
  Entrada,
  Filtros extends Consulta = Consulta,
  Detalhe = T,
>(caminho: string): Recurso<T, Entrada, Filtros, Detalhe> {
  return {
    listar: (filtros, sinal) =>
      api.get<Paginado<T>>(caminho, { consulta: filtros, sinal }),
    buscar: (id, sinal) => api.get<Detalhe>(`${caminho}/${id}`, { sinal }),
    criar: (dados) => api.post<Detalhe>(caminho, dados),
    atualizar: (id, dados) => api.patch<Detalhe>(`${caminho}/${id}`, dados),
    remover: (id) => api.delete(`${caminho}/${id}`),
  };
}
