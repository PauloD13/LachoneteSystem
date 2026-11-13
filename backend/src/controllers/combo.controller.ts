import type { Request, Response } from "express";
import * as comboService from "../services/combo.service.js";
import { idParamSchema, listarComAtivoQuerySchema } from "../validators/comum.js";
import {
  criarComboSchema,
  atualizarComboSchema,
} from "../validators/combo.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarComboSchema.parse(req.body);
  res.status(201).json(await comboService.criar(dados));
}

export async function listar(req: Request, res: Response): Promise<void> {
  const filtros = listarComAtivoQuerySchema.parse(req.query);
  res.status(200).json(await comboService.listar(filtros));
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await comboService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarComboSchema.parse(req.body);
  res.status(200).json(await comboService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await comboService.remover(id);
  res.status(204).send();
}
