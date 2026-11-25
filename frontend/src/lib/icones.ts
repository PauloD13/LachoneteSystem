import type { NomeDoIcone } from "../components/ui/Icone";

/** Ícone da miniatura do produto (sem foto) pelo nome da categoria. */
export function iconeDaCategoria(categoria: string | undefined): NomeDoIcone {
  const nome = (categoria ?? "").toLowerCase();
  if (nome.includes("bebida") || nome.includes("suco")) return "copo";
  if (nome.includes("por")) return "porcao";
  if (nome.includes("sobremesa") || nome.includes("doce")) return "doce";
  return "lanche";
}
