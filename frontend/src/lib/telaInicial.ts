import type { Usuario } from "../types/dominio";

/**
 * Para onde cada pessoa vai ao entrar. Quem acumula cargos cai na tela do
 * cargo mais amplo: gerente → atendente → cozinheiro → entregador.
 */
export function telaInicial(usuario: Pick<Usuario, "cargos">): string {
  const tem = (cargo: string) => usuario.cargos.includes(cargo);
  if (tem("gerente")) return "/gerencia/pedidos";
  if (tem("atendente")) return "/inicio";
  if (tem("cozinheiro")) return "/cozinha";
  if (tem("entregador")) return "/entregas";
  return "/perfil";
}

/** Onde a sessão que expirou estava, para a mesma pessoa voltar para lá. */
export interface Retorno {
  de?: { pathname: string; search?: string };
  /** Id de quem estava logado quando a sessão expirou. */
  quem?: number;
}

/**
 * Para onde ir depois do login. Só volta à tela anterior se for a mesma
 * pessoa cuja sessão expirou e se o cargo dela abre essa tela; senão, a tela
 * inicial do cargo. Quem saiu pelo botão "Sair" não deixa tela de retorno:
 * o próximo a entrar no aparelho começa na própria tela.
 */
export function destinoAposEntrar(
  retorno: Retorno | null | undefined,
  usuario: Pick<Usuario, "id" | "cargos">,
): string {
  const de = retorno?.de;
  if (!de || retorno?.quem !== usuario.id) return telaInicial(usuario);
  if (de.pathname === "/login") return telaInicial(usuario);
  if (
    de.pathname.startsWith("/gerencia") &&
    !usuario.cargos.includes("gerente")
  ) {
    return telaInicial(usuario);
  }
  return de.pathname + (de.search ?? "");
}
