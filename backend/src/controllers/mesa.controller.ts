import type { Request, Response } from "express";
import * as mesaService from "../services/mesa.service.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarMesaSchema,
  atualizarMesaSchema,
} from "../validators/mesa.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarMesaSchema.parse(req.body);
  res.status(201).json(await mesaService.criar(dados));
}

export async function listar(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await mesaService.listar());
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await mesaService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarMesaSchema.parse(req.body);
  res.status(200).json(await mesaService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await mesaService.remover(id);
  res.status(204).send();
}
