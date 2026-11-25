import { createContext } from "react";
import type { NomeDeCargo, Usuario } from "../types/dominio";

export interface ValorDaAutenticacao {
  /** Quem está logado; `null` se ninguém. */
  usuario: Usuario | null;
  /** `true` enquanto confere, ao abrir o sistema, se a sessão salva vale. */
  carregando: boolean;
  /** Devolve quem entrou; lança ErroDaApi se login/senha estiverem errados. */
  entrar(login: string, senha: string): Promise<Usuario>;
  sair(): void;
  /** O usuário exerce HOJE algum destes cargos? */
  temCargo(...cargos: NomeDeCargo[]): boolean;
}

// O contexto fica num arquivo separado do componente (AuthProvider.tsx)
// porque arquivos de componente só devem exportar componentes — é o que
// permite ao Vite recarregar a tela sem perder o estado ao editar.
export const AuthContexto = createContext<ValorDaAutenticacao | null>(null);
