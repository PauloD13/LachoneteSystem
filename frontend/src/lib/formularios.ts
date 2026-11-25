// Ajudas para formulários: o backend espera `null` (e não "") em campos
// opcionais vazios, e devolve erros de validação por campo.

import { ErroDaApi } from "../services/api";

/** "" ou só espaços -> null; senão o texto sem espaços nas pontas. */
export function textoOuNulo(valor: string | null | undefined): string | null {
  const t = (valor ?? "").trim();
  return t === "" ? null : t;
}

/** "12,50" ou "12.50" -> 12.5; vazio ou inválido -> NaN. */
export function numeroDoCampo(valor: string): number {
  const t = valor.trim().replace(/\s/g, "");
  if (t === "") return Number.NaN;
  // "1.234,56" (pt-BR) -> "1234.56"
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  return Number(normal);
}

/** Número -> texto para um campo ("12.5" -> "12,50" quando dinheiro). */
export function campoDeDinheiro(
  valor: number | string | null | undefined,
): string {
  if (valor === null || valor === undefined || valor === "") return "";
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n.toFixed(2).replace(".", ",") : "";
}

/** Erros por campo de uma resposta 400 (primeira mensagem de cada). */
export function errosDosCampos(erro: unknown): Record<string, string> {
  if (!(erro instanceof ErroDaApi)) return {};
  const saida: Record<string, string> = {};
  for (const [campo, mensagens] of Object.entries(erro.campos)) {
    if (mensagens?.[0]) saida[campo] = mensagens[0];
  }
  return saida;
}
