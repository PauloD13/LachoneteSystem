import type { Request, Response } from "express";
import * as promocaoService from "../services/promocao.service.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarPromocaoSchema,
  atualizarPromocaoSchema,
  listarPromocoesQuerySchema,
} from "../validators/promocao.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarPromocaoSchema.parse(req.body);
  res.status(201).json(await promocaoService.criar(dados));
}

export async function listar(req: Request, res: Response): Promise<void> {
  const { ativaEm } = listarPromocoesQuerySchema.parse(req.query);
  res.status(200).json(await promocaoService.listar(ativaEm));
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await promocaoService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarPromocaoSchema.parse(req.body);
  res.status(200).json(await promocaoService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await promocaoService.remover(id);
  res.status(204).send();
}
