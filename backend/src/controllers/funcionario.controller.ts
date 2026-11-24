import type { Request, Response } from "express";
import * as funcionarioService from "../services/funcionario.service.js";
import { usuarioDe } from "../middlewares/autenticacao.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarFuncionarioSchema,
  atualizarFuncionarioSchema,
  listarFuncionariosQuerySchema,
} from "../validators/funcionario.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarFuncionarioSchema.parse(req.body);
  res.status(201).json(await funcionarioService.criar(dados));
}

export async function listar(req: Request, res: Response): Promise<void> {
  const filtros = listarFuncionariosQuerySchema.parse(req.query);
  res.status(200).json(await funcionarioService.listar(filtros));
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await funcionarioService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarFuncionarioSchema.parse(req.body);
  res
    .status(200)
    .json(await funcionarioService.atualizar(id, dados, usuarioDe(req).id));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await funcionarioService.remover(id, usuarioDe(req).id);
  res.status(204).send();
}
