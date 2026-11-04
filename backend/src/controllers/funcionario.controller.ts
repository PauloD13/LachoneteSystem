import type { Request, Response } from "express";
import * as funcionarioService from "../services/funcionario.service.js";
import {
  funcionarioSchema,
} from "../validators/funcionario.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = funcionarioSchema.parse(req.body);
  const novoFuncionario = await funcionarioService.criar(dados);
  res.status(201).json(novoFuncionario);
}

export async function listar(_req: Request, res: Response): Promise<void> {
  const funcionarios = await funcionarioService.listar();
  res.status(200).json(funcionarios);
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const funcionario = await funcionarioService.buscarPorId(id);
  res.status(200).json(funcionario);
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const dados = funcionarioSchema.partial().parse(req.body);
  const funcionarioAtualizado = await funcionarioService.atualizar(id, dados);
  res.status(200).json(funcionarioAtualizado);
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await funcionarioService.remover(id);
  res.status(204).send();
}
