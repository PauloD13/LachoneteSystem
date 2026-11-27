import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AuthContexto } from "./auth-contexto";
import type { ValorDaAutenticacao } from "./auth-contexto";
import { definirAoExpirarSessao, definirToken } from "../services/api";
import { auth } from "../services/auth";
import type { NomeDeCargo, Usuario } from "../types/dominio";

// Onde o token fica guardado entre recargas da página.
//
// localStorage: sobrevive a fechar a aba, o que importa num caixa de
// lanchonete (fechar o navegador sem querer não desloga o atendente). O
// preço: um script malicioso injetado na página conseguiria lê-lo. Isso é
// mitigado pela Content-Security-Policy do backend (só roda script do
// próprio servidor) e pela validade curta do token (8h por padrão).
const CHAVE_DO_TOKEN = "lsc.token";

function lerTokenSalvo(): string | null {
  try {
    return localStorage.getItem(CHAVE_DO_TOKEN);
  } catch {
    return null; // navegação privada com armazenamento bloqueado
  }
}

function salvarToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(CHAVE_DO_TOKEN, token);
    else localStorage.removeItem(CHAVE_DO_TOKEN);
  } catch {
    // sem armazenamento: a sessão dura só enquanto a página estiver aberta
  }
  definirToken(token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  // Só há o que conferir se existe um token salvo de uma visita anterior.
  const [carregando, setCarregando] = useState(() => lerTokenSalvo() !== null);
  const [expirouDe, setExpirouDe] = useState<number | null>(null);
  const usuarioAtual = useRef<Usuario | null>(null);
  useEffect(() => {
    usuarioAtual.current = usuario;
  });

  const encerrar = useCallback((expirou: boolean) => {
    setExpirouDe(expirou ? (usuarioAtual.current?.id ?? null) : null);
    salvarToken(null);
    // O pedido em montagem (CarrinhoProvider) não passa para o próximo usuário.
    try {
      sessionStorage.removeItem("lsc.carrinho");
    } catch {
      // sem armazenamento: nada a limpar
    }
    setUsuario(null);
  }, []);

  const sair = useCallback(() => encerrar(false), [encerrar]);
  const expirar = useCallback(() => encerrar(true), [encerrar]);

  // Ao abrir o sistema: se há um token salvo, pergunta ao backend se ele
  // ainda vale (e quais cargos o usuário tem HOJE).
  useEffect(() => {
    const token = lerTokenSalvo();
    if (!token) return;
    definirToken(token);

    const controle = new AbortController();
    auth
      .eu(controle.signal)
      .then((eu) => setUsuario(eu))
      .catch(() => {
        if (!controle.signal.aborted) salvarToken(null);
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregando(false);
      });
    return () => controle.abort();
  }, []);

  // Qualquer resposta 401 no meio do uso (token expirou, funcionário foi
  // desativado, senha trocada em outro lugar) leva de volta ao login.
  useEffect(() => {
    definirAoExpirarSessao(expirar);
    return () => definirAoExpirarSessao(null);
  }, [expirar]);

  const entrar = useCallback(async (login: string, senha: string) => {
    const resposta = await auth.login(login, senha);
    salvarToken(resposta.token);
    setUsuario(resposta.funcionario);
    return resposta.funcionario;
  }, []);

  const valor = useMemo<ValorDaAutenticacao>(
    () => ({
      usuario,
      carregando,
      entrar,
      sair,
      expirouDe,
      temCargo: (...cargos: NomeDeCargo[]) =>
        usuario !== null &&
        cargos.some((cargo) => usuario.cargos.includes(cargo)),
    }),
    [usuario, carregando, entrar, sair, expirouDe],
  );

  return (
    <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>
  );
}
