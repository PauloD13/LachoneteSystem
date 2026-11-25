/** Carregamento de tela inteira (ex.: conferindo a sessão ao abrir). */
export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="ui-vazio"
      style={{ minHeight: "60dvh", justifyContent: "center" }}
    >
      <span
        className="sc-spinner"
        aria-hidden="true"
        style={{ color: "var(--brand)" }}
      />
      {texto}
    </div>
  );
}
