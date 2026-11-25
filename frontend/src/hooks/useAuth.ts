import { useContext } from "react";
import { AuthContexto } from "../contexts/auth-contexto";
import type { ValorDaAutenticacao } from "../contexts/auth-contexto";

/** Quem está logado, entrar/sair e checagem de cargo. */
export function useAuth(): ValorDaAutenticacao {
  const valor = useContext(AuthContexto);
  if (!valor) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  }
  return valor;
}
