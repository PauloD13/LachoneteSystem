import { Link, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { Vazio } from "../components/ui/Estados";
import { telaInicial } from "../lib/telaInicial";
import type { NomeDeCargo } from "../types/dominio";

/**
 * Envolve rotas restritas a alguns cargos (cadastros e relatórios só para
 * gerente). É só conforto visual: quem garante a regra de verdade é o
 * backend, que responde 403 para quem não tem o cargo.
 */
export function ExigeCargo({ cargos }: { cargos: NomeDeCargo[] }) {
  const { usuario, temCargo } = useAuth();

  if (!temCargo(...cargos)) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "48px 16px" }}>
        <h1 className="ui-titulo-pagina" style={{ textAlign: "center" }}>
          Acesso restrito
        </h1>
        <Vazio
          icone="chave"
          acao={
            <Link
              to={usuario ? telaInicial(usuario) : "/"}
              className="sc-btn sc-btn--primary"
            >
              Ir para a minha tela
            </Link>
          }
        >
          Esta área é exclusiva de: {cargos.join(", ")}.
        </Vazio>
      </main>
    );
  }
  return <Outlet />;
}
