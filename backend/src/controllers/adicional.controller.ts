import type { Request, Response } from "express";
import * as adicionalService from "../services/adicional.service.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarAdicionalSchema,
  atualizarAdicionalSchema,
} from "../validators/adicional.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarAdicionalSchema.parse(req.body);
  res.status(201).json(await adicionalService.criar(dados));
}

export async function listar(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await adicionalService.listar());
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await adicionalService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarAdicionalSchema.parse(req.body);
  res.status(200).json(await adicionalService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await adicionalService.remover(id);
  res.status(204).send();
}
