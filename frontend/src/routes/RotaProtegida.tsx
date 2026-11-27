import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { Carregando } from "../components/Carregando";
import type { Retorno } from "../lib/telaInicial";

/**
 * Envolve as rotas que exigem login. Sem usuário, manda para /login. Se a
 * sessão expirou no meio do uso, lembra a tela e de quem era, para a mesma
 * pessoa voltar a ela; depois de um "Sair", não lembra nada.
 */
export function RotaProtegida() {
  const { usuario, carregando, expirouDe } = useAuth();
  const local = useLocation();

  if (carregando) return <Carregando texto="Conferindo sua sessão…" />;
  if (!usuario) {
    const retorno: Retorno | undefined =
      expirouDe === null ? undefined : { de: local, quem: expirouDe };
    return <Navigate to="/login" replace state={retorno} />;
  }
  return <Outlet />;
}
