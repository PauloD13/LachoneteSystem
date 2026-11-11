import type { Request, Response } from "express";
import * as ingredienteService from "../services/ingrediente.service.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarIngredienteSchema,
  atualizarIngredienteSchema,
} from "../validators/ingrediente.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarIngredienteSchema.parse(req.body);
  res.status(201).json(await ingredienteService.criar(dados));
}

export async function listar(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await ingredienteService.listar());
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await ingredienteService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarIngredienteSchema.parse(req.body);
  res.status(200).json(await ingredienteService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await ingredienteService.remover(id);
  res.status(204).send();
}
