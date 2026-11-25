// Fábrica de serviços CRUD. Quase todo cadastro da API segue o mesmo padrão
// (GET lista paginada, GET /:id, POST, PATCH /:id, DELETE /:id); em vez de
// escrever as mesmas cinco funções para cada um, declara-se o recurso uma
// vez (ver services/cadastros.ts) e todas as telas usam a mesma interface.

import { api } from "./api";
import type { ConsultaPaginada, Paginado } from "../types/api";

type Consulta = ConsultaPaginada &
  Record<string, string | number | boolean | null | undefined>;

export interface Recurso<T, Entrada, Filtros extends Consulta = Consulta> {
  listar(filtros?: Filtros, sinal?: AbortSignal): Promise<Paginado<T>>;
  buscar(id: number, sinal?: AbortSignal): Promise<T>;
  criar(dados: Entrada): Promise<T>;
  atualizar(id: number, dados: Partial<Entrada>): Promise<T>;
  remover(id: number): Promise<void>;
}

export function criarRecurso<T, Entrada, Filtros extends Consulta = Consulta>(
  caminho: string,
): Recurso<T, Entrada, Filtros> {
  return {
    listar: (filtros, sinal) =>
      api.get<Paginado<T>>(caminho, { consulta: filtros, sinal }),
    buscar: (id, sinal) => api.get<T>(`${caminho}/${id}`, { sinal }),
    criar: (dados) => api.post<T>(caminho, dados),
    atualizar: (id, dados) => api.patch<T>(`${caminho}/${id}`, dados),
    remover: (id) => api.delete(`${caminho}/${id}`),
  };
}
