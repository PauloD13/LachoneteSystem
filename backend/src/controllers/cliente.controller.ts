import type { Request, Response } from "express";
import * as clienteService from "../services/cliente.service.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarClienteSchema,
  atualizarClienteSchema,
  listarClientesQuerySchema,
} from "../validators/cliente.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarClienteSchema.parse(req.body);
  res.status(201).json(await clienteService.criar(dados));
}

export async function listar(req: Request, res: Response): Promise<void> {
  const filtros = listarClientesQuerySchema.parse(req.query);
  res.status(200).json(await clienteService.listar(filtros));
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await clienteService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarClienteSchema.parse(req.body);
  res.status(200).json(await clienteService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await clienteService.remover(id);
  res.status(204).send();
}
