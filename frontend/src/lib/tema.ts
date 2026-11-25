// Tema claro/escuro. Os tokens do design system trocam de valor conforme o
// atributo data-theme da tag <html> (ver styles/tokens.css).
//
// Preferência salva no navegador: "claro", "escuro" ou "sistema" (segue a
// configuração do aparelho e muda junto com ela). Padrão: "sistema".

export type PreferenciaDeTema = "claro" | "escuro" | "sistema";

const CHAVE = "lsc.tema";
const consulta = () => window.matchMedia("(prefers-color-scheme: dark)");

export function lerPreferencia(): PreferenciaDeTema {
  try {
    const salva = localStorage.getItem(CHAVE);
    if (salva === "claro" || salva === "escuro") return salva;
  } catch {
    // armazenamento bloqueado: segue o sistema
  }
  return "sistema";
}

function aplicar(preferencia: PreferenciaDeTema): void {
  const escuro =
    preferencia === "escuro" ||
    (preferencia === "sistema" && consulta().matches);
  document.documentElement.dataset.theme = escuro ? "dark" : "light";
}

export function definirPreferencia(preferencia: PreferenciaDeTema): void {
  try {
    if (preferencia === "sistema") localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, preferencia);
  } catch {
    // vale só até recarregar a página
  }
  aplicar(preferencia);
}

let ouvindo = false;

/** Aplica a preferência salva e acompanha a troca de tema do aparelho. */
export function aplicarTemaSalvo(): void {
  aplicar(lerPreferencia());
  if (ouvindo) return;
  ouvindo = true;
  consulta().addEventListener("change", () => {
    if (lerPreferencia() === "sistema") aplicar("sistema");
  });
}
