import type { Request, Response } from "express";
import * as authService from "../services/auth.service.js";
import { usuarioDe } from "../middlewares/autenticacao.js";
import { loginSchema, trocarSenhaSchema } from "../validators/auth.validator.js";

export async function login(req: Request, res: Response): Promise<void> {
  const dados = loginSchema.parse(req.body);
  res.status(200).json(await authService.login(dados));
}

// Quem sou eu e quais cargos exerço hoje — o frontend usa para decidir
// quais telas e botões mostrar.
export async function eu(req: Request, res: Response): Promise<void> {
  res.status(200).json(usuarioDe(req));
}

export async function trocarSenha(req: Request, res: Response): Promise<void> {
  const dados = trocarSenhaSchema.parse(req.body);
  await authService.trocarSenha(usuarioDe(req).id, dados);
  res.status(204).send();
}
