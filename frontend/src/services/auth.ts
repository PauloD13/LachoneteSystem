import { api } from "./api";
import type { RespostaLogin, Usuario } from "../types/dominio";

export const auth = {
  login: (login: string, senha: string) =>
    api.post<RespostaLogin>("/auth/login", { login, senha }),
  /** Quem está logado e quais cargos exerce hoje. */
  eu: (sinal?: AbortSignal) => api.get<Usuario>("/auth/me", { sinal }),
  trocarSenha: (senhaAtual: string, novaSenha: string) =>
    api.patch<void>("/auth/senha", { senhaAtual, novaSenha }),
};
