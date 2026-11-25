import type { Paginado } from "../../types/api";

interface Props {
  paginacao: Paginado<unknown>["paginacao"] | undefined;
  aoMudar(pagina: number): void;
}

/** "Página 2 de 5" com anterior/próxima (some quando há uma página só). */
export function Paginacao({ paginacao, aoMudar }: Props) {
  if (!paginacao || paginacao.totalPaginas <= 1) return null;
  const { pagina, totalPaginas } = paginacao;
  return (
    <nav
      aria-label="Paginação"
      className="ui-linha ui-linha--entre"
      style={{ paddingTop: 4 }}
    >
      <button
        type="button"
        className="sc-btn sc-btn--ghost"
        disabled={pagina <= 1}
        onClick={() => aoMudar(pagina - 1)}
      >
        Anterior
      </button>
      <span className="ui-texto-sm ui-suave" aria-current="page">
        Página {pagina} de {totalPaginas}
      </span>
      <button
        type="button"
        className="sc-btn sc-btn--ghost"
        disabled={pagina >= totalPaginas}
        onClick={() => aoMudar(pagina + 1)}
      >
        Próxima
      </button>
    </nav>
  );
}
