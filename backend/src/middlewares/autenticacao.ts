import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/appError.js";
import { CARGO, type NomeDeCargo } from "../lib/cargos.js";
import * as authService from "../services/auth.service.js";

export interface UsuarioAutenticado {
  id: number;
  nome: string;
  /** Nomes dos cargos que o funcionário exerce HOJE. */
  cargos: string[];
}

// AUTENTICAÇÃO = "quem é você?". Lê o token do cabeçalho
//   Authorization: Bearer <token>
// e, se for válido, deixa o funcionário disponível em req.usuario.
//
// O funcionário e seus cargos são relidos do banco a cada requisição (e não
// copiados para dentro do token): assim desativar alguém ou encerrar um cargo
// vale na hora, sem esperar o token expirar.
export async function autenticar(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const [esquema, token] = (req.get("authorization") ?? "").split(" ");
  if (esquema?.toLowerCase() !== "bearer" || !token) {
    throw new AppError(401, "Autenticação necessária: faça login.");
  }
  req.usuario = await authService.identificar(token);
  next();
}

// AUTORIZAÇÃO = "você pode fazer isto?". Sempre depois de `autenticar`.
// Uso nas rotas: router.post("/", exigirCargo(CARGO.GERENTE), controller.criar)
export function exigirCargo(...permitidos: NomeDeCargo[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const usuario = usuarioDe(req);
    const autorizado = usuario.cargos.some((cargo) =>
      (permitidos as string[]).includes(cargo),
    );
    if (!autorizado) {
      throw new AppError(
        403,
        `Ação restrita ao(s) cargo(s): ${permitidos.join(", ")}.`,
      );
    }
    next();
  };
}

/** Atalho para a regra mais comum: cadastros e relatórios são do gerente. */
export const soGerente = exigirCargo(CARGO.GERENTE);

/** Usuário da requisição, já garantido pelo middleware `autenticar`. */
export function usuarioDe(req: Request): UsuarioAutenticado {
  if (!req.usuario) {
    throw new AppError(401, "Autenticação necessária: faça login.");
  }
  return req.usuario;
}
