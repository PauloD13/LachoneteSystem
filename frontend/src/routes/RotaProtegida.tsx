import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { Carregando } from "../components/Carregando";

/**
 * Envolve as rotas que exigem login. Sem usuário, manda para /login
 * lembrando de onde veio, para voltar à mesma tela depois de entrar.
 */
export function RotaProtegida() {
  const { usuario, carregando } = useAuth();
  const local = useLocation();

  if (carregando) return <Carregando texto="Conferindo sua sessão…" />;
  if (!usuario) return <Navigate to="/login" replace state={{ de: local }} />;
  return <Outlet />;
}
