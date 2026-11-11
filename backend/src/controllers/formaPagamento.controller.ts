import type { Request, Response } from "express";
import * as formaPagamentoService from "../services/formaPagamento.service.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarFormaPagamentoSchema,
  atualizarFormaPagamentoSchema,
} from "../validators/formaPagamento.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarFormaPagamentoSchema.parse(req.body);
  res.status(201).json(await formaPagamentoService.criar(dados));
}

export async function listar(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await formaPagamentoService.listar());
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await formaPagamentoService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarFormaPagamentoSchema.parse(req.body);
  res.status(200).json(await formaPagamentoService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await formaPagamentoService.remover(id);
  res.status(204).send();
}
