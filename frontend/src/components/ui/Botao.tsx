import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "perigo";

const CLASSE: Record<Variante, string> = {
  primario: "sc-btn--primary",
  secundario: "sc-btn--secondary",
  fantasma: "sc-btn--ghost",
  perigo: "sc-btn--danger",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  /** 56px de altura (cozinha, caixa, ação principal da tela). */
  grande?: boolean;
  /** Ocupa a largura toda. */
  bloco?: boolean;
  /** Mostra o giro e o gerúndio, e desabilita contra clique em dobro. */
  carregando?: boolean;
  /** Texto enquanto carrega (ex.: "Enviando…"). */
  textoCarregando?: ReactNode;
}

/** Botão do design system. Rótulo começa com verbo; um primário por tela. */
export function Botao({
  variante = "secundario",
  grande,
  bloco,
  carregando,
  textoCarregando,
  className,
  children,
  disabled,
  type = "button",
  ...resto
}: Props) {
  const classes = [
    "sc-btn",
    CLASSE[variante],
    grande && "sc-btn--lg",
    bloco && "sc-btn--block",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando ? (
        <>
          <span className="sc-spinner" aria-hidden="true" />
          {textoCarregando ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
