import { NavLink, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";
import estilos from "./LayoutPrincipal.module.css";

// PROVISÓRIO: estrutura mínima até o protótipo definir o visual. A parte
// que deve permanecer é a semântica: <header>, <nav>, <main>.
export function LayoutPrincipal() {
  const { usuario, sair } = useAuth();

  return (
    <div className={estilos.layout}>
      <header className={estilos.cabecalho}>
        <span className={estilos.marca}>Lanchonete Sabor &amp; Cia</span>
        <nav aria-label="Principal">
          <ul className={estilos.menu}>
            <li>
              <NavLink to="/" end>
                Início
              </NavLink>
            </li>
          </ul>
        </nav>
        <div className={estilos.usuario}>
          <span>
            {usuario?.nome}
            {usuario && usuario.cargos.length > 0 && (
              <small> ({usuario.cargos.join(", ")})</small>
            )}
          </span>
          <button type="button" onClick={sair}>
            Sair
          </button>
        </div>
      </header>
      <main className={estilos.conteudo}>
        <Outlet />
      </main>
    </div>
  );
}
