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
