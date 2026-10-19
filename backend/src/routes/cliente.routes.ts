import { Router } from 'express';
import * as clienteController from '../controllers/cliente.controller.js';

const clienteRoutes = Router();

clienteRoutes.post('/', clienteController.criar);
clienteRoutes.get('/', clienteController.listar);
clienteRoutes.get('/:id', clienteController.buscarPorId);
clienteRoutes.patch('/:id', clienteController.atualizar);
clienteRoutes.delete('/:id', clienteController.remover);

export default clienteRoutes;
