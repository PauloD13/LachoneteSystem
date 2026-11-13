import type { Request, Response } from "express";
import * as categoriaService from "../services/categoria.service.js";
import { idParamSchema, paginacaoQuerySchema } from "../validators/comum.js";
import {
  criarCategoriaSchema,
  atualizarCategoriaSchema,
} from "../validators/categoria.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarCategoriaSchema.parse(req.body);
  res.status(201).json(await categoriaService.criar(dados));
}

export async function listar(req: Request, res: Response): Promise<void> {
  const filtros = paginacaoQuerySchema.parse(req.query);
  res.status(200).json(await categoriaService.listar(filtros));
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await categoriaService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarCategoriaSchema.parse(req.body);
  res.status(200).json(await categoriaService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await categoriaService.remover(id);
  res.status(204).send();
}
