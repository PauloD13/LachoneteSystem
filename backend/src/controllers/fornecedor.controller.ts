import type { Request, Response } from "express";
import * as fornecedorService from "../services/fornecedor.service.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarFornecedorSchema,
  atualizarFornecedorSchema,
} from "../validators/fornecedor.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarFornecedorSchema.parse(req.body);
  res.status(201).json(await fornecedorService.criar(dados));
}

export async function listar(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await fornecedorService.listar());
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await fornecedorService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarFornecedorSchema.parse(req.body);
  res.status(200).json(await fornecedorService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await fornecedorService.remover(id);
  res.status(204).send();
}
