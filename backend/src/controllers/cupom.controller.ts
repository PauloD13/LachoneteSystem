import type { Request, Response } from "express";
import * as cupomService from "../services/cupom.service.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarCupomSchema,
  atualizarCupomSchema,
} from "../validators/cupom.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarCupomSchema.parse(req.body);
  res.status(201).json(await cupomService.criar(dados));
}

export async function listar(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await cupomService.listar());
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await cupomService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarCupomSchema.parse(req.body);
  res.status(200).json(await cupomService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await cupomService.remover(id);
  res.status(204).send();
}
