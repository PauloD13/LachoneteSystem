/** Indicador de carregamento acessível (leitores de tela anunciam o texto). */
export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <p role="status" aria-live="polite" className="carregando">
      {texto}
    </p>
  );
}
