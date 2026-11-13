import type { Request, Response } from "express";
import * as cargoService from "../services/cargo.service.js";
import { idParamSchema, paginacaoQuerySchema } from "../validators/comum.js";
import {
  criarCargoSchema,
  atualizarCargoSchema,
} from "../validators/cargo.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarCargoSchema.parse(req.body);
  res.status(201).json(await cargoService.criar(dados));
}

export async function listar(req: Request, res: Response): Promise<void> {
  const filtros = paginacaoQuerySchema.parse(req.query);
  res.status(200).json(await cargoService.listar(filtros));
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await cargoService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarCargoSchema.parse(req.body);
  res.status(200).json(await cargoService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await cargoService.remover(id);
  res.status(204).send();
}
