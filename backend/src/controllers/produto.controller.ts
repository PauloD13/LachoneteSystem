import type { Request, Response } from "express";
import * as produtoService from "../services/produto.service.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarProdutoSchema,
  atualizarProdutoSchema,
  listarProdutosQuerySchema,
} from "../validators/produto.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarProdutoSchema.parse(req.body);
  res.status(201).json(await produtoService.criar(dados));
}

export async function listar(req: Request, res: Response): Promise<void> {
  const filtros = listarProdutosQuerySchema.parse(req.query);
  res.status(200).json(await produtoService.listar(filtros));
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await produtoService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarProdutoSchema.parse(req.body);
  res.status(200).json(await produtoService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await produtoService.remover(id);
  res.status(204).send();
}
