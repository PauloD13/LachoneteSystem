import { Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";
import type { NomeDeCargo } from "../types/dominio";

/**
 * Envolve rotas restritas a alguns cargos (ex.: cadastros e relatórios só
 * para gerente). É só conforto visual: quem garante a regra de verdade é o
 * backend, que responde 403 para quem não tem o cargo.
 */
export function ExigeCargo({ cargos }: { cargos: NomeDeCargo[] }) {
  const { temCargo } = useAuth();

  if (!temCargo(...cargos)) {
    return (
      <section>
        <h1>Acesso restrito</h1>
        <p>Esta área é exclusiva de: {cargos.join(", ")}.</p>
      </section>
    );
  }
  return <Outlet />;
}
