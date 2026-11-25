import { createContext } from "react";

export interface ValorDosAvisos {
  /** Aviso escuro com ✓, some em 3 s. */
  sucesso(texto: string): void;
  /** Aviso vermelho com o que fazer; aceita um erro da API. */
  erro(erroOuTexto: unknown): void;
}

export const AvisosContexto = createContext<ValorDosAvisos | null>(null);
