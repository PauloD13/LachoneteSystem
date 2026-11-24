import type { Request, Response } from "express";
import * as pedidoService from "../services/pedido.service.js";
import { usuarioDe } from "../middlewares/autenticacao.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarPedidoSchema,
  listarPedidosQuerySchema,
  atualizarStatusSchema,
  pagamentoSchema,
  definirEntregadorSchema,
  avaliarPedidoSchema,
} from "../validators/pedido.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarPedidoSchema.parse(req.body);
  res.status(201).json(await pedidoService.criar(dados, usuarioDe(req)));
}

export async function listar(req: Request, res: Response): Promise<void> {
  const filtros = listarPedidosQuerySchema.parse(req.query);
  res.status(200).json(await pedidoService.listar(filtros));
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await pedidoService.buscarPorId(id));
}

// GET /clientes/:id/pedidos — histórico de pedidos de um cliente.
export async function listarPorCliente(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const filtros = listarPedidosQuerySchema.parse(req.query);
  res.status(200).json(await pedidoService.listarPorCliente(id, filtros));
}

export async function atualizarStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const { status } = atualizarStatusSchema.parse(req.body);
  res.status(200).json(await pedidoService.atualizarStatus(id, status));
}

export async function adicionarPagamento(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = pagamentoSchema.parse(req.body);
  res.status(201).json(await pedidoService.adicionarPagamento(id, dados));
}

export async function definirEntregador(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const { entregadorId } = definirEntregadorSchema.parse(req.body);
  res
    .status(200)
    .json(await pedidoService.definirEntregador(id, entregadorId));
}

export async function avaliar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = avaliarPedidoSchema.parse(req.body);
  res.status(201).json(await pedidoService.avaliar(id, dados));
}
