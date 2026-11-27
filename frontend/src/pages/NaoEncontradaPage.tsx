import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { Icone } from "../components/ui/Icone";
import { telaInicial } from "../lib/telaInicial";
import estilos from "./PaginaInformativa.module.css";

/**
 * Página 404: qualquer endereço que não é uma tela do sistema. Fica fora do
 * login, para quem não entrou não ser mandado à tela de login por um
 * endereço digitado errado; o botão leva cada um para onde faz sentido.
 */
export function NaoEncontradaPage() {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const destino = usuario ? telaInicial(usuario) : "/login";

  return (
    <main className={estilos.centro}>
      <section className={estilos.erro} aria-labelledby="h-404">
        <span className={estilos.prato} aria-hidden="true">
          <Icone nome="lanche" tamanho={48} traco={1.6} />
        </span>
        <span className={estilos.codigo} aria-hidden="true">
          404
        </span>
        <h1 id="h-404" className="ui-titulo-pagina">
          Esse prato não está no cardápio
        </h1>
        <p>
          A página <code>{pathname}</code> não existe ou mudou de endereço.
          Confira o link ou volte para uma tela conhecida.
        </p>
        <div className="ui-linha ui-linha--quebra" style={{ gap: 12 }}>
          <Link to={destino} className="sc-btn sc-btn--primary">
            <Icone nome="inicio" />
            {usuario ? "Ir para a minha tela" : "Ir para o login"}
          </Link>
          {window.history.length > 1 && (
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              onClick={() => navegar(-1)}
            >
              <Icone nome="voltar" />
              Voltar
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
