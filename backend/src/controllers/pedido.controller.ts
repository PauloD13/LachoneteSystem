import type { Request, Response } from "express";
import * as pedidoService from "../services/pedido.service.js";
import { usuarioDe } from "../middlewares/autenticacao.js";
import { publicarPedido } from "../lib/eventos.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarPedidoSchema,
  listarPedidosQuerySchema,
  atualizarStatusSchema,
  pagamentoSchema,
  definirEntregadorSchema,
  avaliarPedidoSchema,
} from "../validators/pedido.validator.js";

// Toda ação que muda um pedido avisa as telas conectadas (cozinha, listas),
// depois de gravada.
function responderEAvisar<T extends { id: number; statusAtual: string }>(
  res: Response,
  status: number,
  pedido: T,
): void {
  res.status(status).json(pedido);
  publicarPedido({ id: pedido.id, statusAtual: pedido.statusAtual });
}

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarPedidoSchema.parse(req.body);
  responderEAvisar(res, 201, await pedidoService.criar(dados, usuarioDe(req)));
}

// Mesmo corpo do POST /pedidos; nada é gravado.
export async function simular(req: Request, res: Response): Promise<void> {
  const dados = criarPedidoSchema.parse(req.body);
  res.status(200).json(await pedidoService.simular(dados, usuarioDe(req)));
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
  responderEAvisar(res, 200, await pedidoService.atualizarStatus(id, status));
}

export async function adicionarPagamento(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = pagamentoSchema.parse(req.body);
  responderEAvisar(res, 201, await pedidoService.adicionarPagamento(id, dados));
}

export async function definirEntregador(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const { entregadorId } = definirEntregadorSchema.parse(req.body);
  responderEAvisar(
    res,
    200,
    await pedidoService.definirEntregador(id, entregadorId),
  );
}

export async function avaliar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = avaliarPedidoSchema.parse(req.body);
  responderEAvisar(res, 201, await pedidoService.avaliar(id, dados));
}
