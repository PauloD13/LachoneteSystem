import type { Cliente, Endereco } from "../types/dominio";

/** O cliente tem endereço padrão completo (dá para entregar sem digitar)? */
export function temEnderecoCompleto(c: Cliente): boolean {
  return Boolean(
    c.enderecoPadraoLogradouro &&
    c.enderecoPadraoNumero &&
    c.enderecoPadraoBairro &&
    c.enderecoPadraoCidade &&
    c.enderecoPadraoCep,
  );
}

/** "Rua das Palmeiras, 120 · Centro" */
export function enderecoEmTexto(e: Endereco): string {
  return `${e.logradouro}, ${e.numero} · ${e.bairro}`;
}

/** Endereço padrão do cadastro em texto, ou null se incompleto. */
export function enderecoDoCliente(c: Cliente): string | null {
  if (!temEnderecoCompleto(c)) return null;
  return `${c.enderecoPadraoLogradouro}, ${c.enderecoPadraoNumero} · ${c.enderecoPadraoBairro}`;
}
