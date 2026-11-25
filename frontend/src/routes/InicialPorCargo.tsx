import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { telaInicial } from "../lib/telaInicial";

/** "/" — manda cada pessoa para a tela do seu cargo. */
export function InicialPorCargo() {
  const { usuario } = useAuth();
  return <Navigate to={usuario ? telaInicial(usuario) : "/login"} replace />;
}
