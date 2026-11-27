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
  /**
   * Id de quem estava logado quando a sessão expirou (401 no meio do uso);
   * `null` depois de um "Sair" voluntário. Decide se o login volta para a
   * tela anterior (ver destinoAposEntrar).
   */
  expirouDe: number | null;
  /** O usuário exerce HOJE algum destes cargos? */
  temCargo(...cargos: NomeDeCargo[]): boolean;
}

// Fora de AuthProvider.tsx para o Vite recarregar a tela sem perder estado.
export const AuthContexto = createContext<ValorDaAutenticacao | null>(null);
