import type { Request, Response } from "express";
import * as cargoService from "../services/cargo.service.js";
import {
  criarCargoSchema,
  atualizarCargoSchema,
  cargoIdParamSchema,
} from "../validators/cargo.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarCargoSchema.parse(req.body);
  const novoCargo = await cargoService.criar(dados);
  res.status(201).json(novoCargo);
}

export async function listar(_req: Request, res: Response): Promise<void> {
  const cargos = await cargoService.listar();
  res.status(200).json(cargos);
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = cargoIdParamSchema.parse(req.params);
  const cargo = await cargoService.buscarPorId(id);
  res.status(200).json(cargo);
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = cargoIdParamSchema.parse(req.params);
  const dados = atualizarCargoSchema.parse(req.body);
  const cargoAtualizado = await cargoService.atualizar(id, dados);
  res.status(200).json(cargoAtualizado);
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = cargoIdParamSchema.parse(req.params);
  await cargoService.remover(id);
  res.status(204).send();
}
