import type { Request, Response } from "express";
import * as categoriaService from "../services/categoria.service.js";
import {
  criarCategoriaSchema,
  atualizarCategoriaSchema,
  categoriaIdParamSchema,
} from "../validators/categoria.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarCategoriaSchema.parse(req.body);
  const novaCategoria = await categoriaService.criar(dados);
  res.status(201).json(novaCategoria);
}

export async function listar(_req: Request, res: Response): Promise<void> {
  const categorias = await categoriaService.listar();
  res.status(200).json(categorias);
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = categoriaIdParamSchema.parse(req.params);
  const categoria = await categoriaService.buscarPorId(id);
  res.status(200).json(categoria);
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = categoriaIdParamSchema.parse(req.params);
  const dados = atualizarCategoriaSchema.parse(req.body);
  const categoriaAtualizada = await categoriaService.atualizar(id, dados);
  res.status(200).json(categoriaAtualizada);
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = categoriaIdParamSchema.parse(req.params);
  await categoriaService.remover(id);
  res.status(204).send();
}