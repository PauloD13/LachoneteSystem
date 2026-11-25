import { useEffect, useRef } from "react";

/**
 * Chama `acao` a cada `ms` enquanto a aba estiver visível (e uma vez ao
 * voltar para ela). Usado para manter atualizadas a cozinha, o início e as
 * entregas sem precisar recarregar a página.
 */
export function usePeriodico(acao: () => void, ms: number): void {
  const atual = useRef(acao);
  useEffect(() => {
    atual.current = acao;
  });

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") atual.current();
    }, ms);
    function aoVoltar() {
      if (document.visibilityState === "visible") atual.current();
    }
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [ms]);
}
