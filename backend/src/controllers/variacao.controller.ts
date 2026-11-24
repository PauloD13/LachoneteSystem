import type { Request, Response } from "express";
import * as variacaoService from "../services/variacao.service.js";
import {
  produtoIdParamSchema,
  variacaoParamSchema,
  criarVariacaoSchema,
  atualizarVariacaoSchema,
} from "../validators/variacao.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const { produtoId } = produtoIdParamSchema.parse(req.params);
  const dados = criarVariacaoSchema.parse(req.body);
  res.status(201).json(await variacaoService.criar(produtoId, dados));
}

export async function listar(req: Request, res: Response): Promise<void> {
  const { produtoId } = produtoIdParamSchema.parse(req.params);
  res.status(200).json(await variacaoService.listar(produtoId));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { produtoId, variacaoId } = variacaoParamSchema.parse(req.params);
  const dados = atualizarVariacaoSchema.parse(req.body);
  res
    .status(200)
    .json(await variacaoService.atualizar(produtoId, variacaoId, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { produtoId, variacaoId } = variacaoParamSchema.parse(req.params);
  await variacaoService.remover(produtoId, variacaoId);
  res.status(204).send();
}
