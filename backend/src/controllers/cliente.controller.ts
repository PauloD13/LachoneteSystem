import { Request, Response } from 'express';
import * as clienteService from '../services/cliente.service';
import {
  criarClienteSchema,
  atualizarClienteSchema,
  clienteIdParamSchema,
} from '../validators/cliente.validator';

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarClienteSchema.parse(req.body);
  const novoCliente = await clienteService.criar(dados);
  res.status(201).json(novoCliente);
}

export async function listar(_req: Request, res: Response): Promise<void> {
  const clientes = await clienteService.listar();
  res.status(200).json(clientes);
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = clienteIdParamSchema.parse(req.params);
  const cliente = await clienteService.buscarPorId(id);
  res.status(200).json(cliente);
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = clienteIdParamSchema.parse(req.params);
  const dados = atualizarClienteSchema.parse(req.body);
  const clienteAtualizado = await clienteService.atualizar(id, dados);
  res.status(200).json(clienteAtualizado);
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = clienteIdParamSchema.parse(req.params);
  await clienteService.remover(id);
  res.status(204).send();
}
