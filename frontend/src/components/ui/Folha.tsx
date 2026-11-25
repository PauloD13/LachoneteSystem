import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icone } from "./Icone";

interface Props {
  aberta: boolean;
  aoFechar(): void;
  titulo: ReactNode;
  /** Linha abaixo do título (preço, descrição). */
  subtitulo?: ReactNode;
  children: ReactNode;
  /** Barra fixa embaixo (ação principal). */
  rodape?: ReactNode;
  /** Largura máxima em telas largas (vira diálogo central). */
  largura?: number;
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Folha inferior (bottom sheet): sobe da base sobre o fundo escurecido.
 * Fecha no ✕, no fundo ou com Esc; o foco fica preso dentro dela e volta
 * para onde estava ao fechar. Em telas largas vira um diálogo central.
 */
export function Folha({
  aberta,
  aoFechar,
  titulo,
  subtitulo,
  children,
  rodape,
  largura,
}: Props) {
  const idTitulo = useId();
  const painel = useRef<HTMLElement>(null);
  const fechar = useRef(aoFechar);
  useEffect(() => {
    fechar.current = aoFechar;
  });

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement as HTMLElement | null;
    const corpo = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco no primeiro campo (ou no próprio painel).
    const primeiro = painel.current?.querySelector<HTMLElement>(
      "input:not([type=checkbox]):not([type=radio]), select, textarea",
    );
    (primeiro ?? painel.current)?.focus();

    function teclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        fechar.current();
        return;
      }
      if (evento.key !== "Tab" || !painel.current) return;
      const itens = [
        ...painel.current.querySelectorAll<HTMLElement>(FOCAVEIS),
      ].filter((el) => el.offsetParent !== null);
      if (itens.length === 0) return;
      const [inicio, fim] = [itens[0], itens[itens.length - 1]];
      if (evento.shiftKey && document.activeElement === inicio) {
        evento.preventDefault();
        fim.focus();
      } else if (!evento.shiftKey && document.activeElement === fim) {
        evento.preventDefault();
        inicio.focus();
      }
    }
    document.addEventListener("keydown", teclado);
    return () => {
      document.removeEventListener("keydown", teclado);
      document.body.style.overflow = corpo;
      anterior?.focus?.();
    };
  }, [aberta]);

  if (!aberta) return null;

  return createPortal(
    <div className="ui-sobreposicao sc-root">
      <button
        type="button"
        className="sc-scrim"
        aria-label="Fechar"
        tabIndex={-1}
        onClick={aoFechar}
      />
      <section
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="ui-folha sc-sheet-enter"
        style={largura ? { width: `min(${largura}px, 100%)` } : undefined}
      >
        <div className="ui-folha__alca" aria-hidden="true" />
        <div className="ui-folha__cabeca">
          <div className="ui-coluna" style={{ flex: 1, gap: 4 }}>
            <h2 id={idTitulo} className="ui-folha__titulo">
              {titulo}
            </h2>
            {subtitulo}
          </div>
          <button
            type="button"
            className="sc-btn sc-btn--ghost ui-botao-icone"
            aria-label="Fechar"
            onClick={aoFechar}
          >
            <Icone nome="fechar" />
          </button>
        </div>
        <div className="ui-folha__corpo">{children}</div>
        {rodape && <footer className="ui-folha__rodape">{rodape}</footer>}
      </section>
    </div>,
    document.body,
  );
}
