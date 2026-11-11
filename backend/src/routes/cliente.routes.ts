import { Router } from 'express';
import * as clienteController from '../controllers/cliente.controller.js';
import * as pedidoController from '../controllers/pedido.controller.js';

const clienteRoutes = Router();

clienteRoutes.post('/', clienteController.criar);
clienteRoutes.get('/', clienteController.listar);
clienteRoutes.get('/:id', clienteController.buscarPorId);
clienteRoutes.patch('/:id', clienteController.atualizar);
clienteRoutes.delete('/:id', clienteController.remover);

// Histórico de pedidos do cliente (regra de negócio 4.1)
clienteRoutes.get('/:id/pedidos', pedidoController.listarPorCliente);

export default clienteRoutes;
