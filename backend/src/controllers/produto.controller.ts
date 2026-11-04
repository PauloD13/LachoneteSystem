import type { Request, Response } from "express";
import * as produtoService from "../services/produto.service.js";
import {
  criarProdutoSchema,
  atualizarProdutoSchema,
  produtoIdParamSchema,
} from "../validators/produto.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarProdutoSchema.parse(req.body);
  const novoProduto = await produtoService.criar(dados);
  res.status(201).json(novoProduto);
}

export async function listar(_req: Request, res: Response): Promise<void> {
  const produtos = await produtoService.listar();
  res.status(200).json(produtos);
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = produtoIdParamSchema.parse(req.params);
  const produto = await produtoService.buscarPorId(id);
  res.status(200).json(produto);
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = produtoIdParamSchema.parse(req.params);
  const dados = atualizarProdutoSchema.parse(req.body);
  const produtoAtualizado = await produtoService.atualizar(id, dados);
  res.status(200).json(produtoAtualizado);
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = produtoIdParamSchema.parse(req.params);
  await produtoService.remover(id);
  res.status(204).send();
}
