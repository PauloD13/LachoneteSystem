import { Router } from "express";
import * as clienteController from "../controllers/cliente.controller.js";
import * as pedidoController from "../controllers/pedido.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

const clienteRoutes = Router();

// Cadastrar e corrigir cliente faz parte do atendimento: qualquer
// funcionário logado. Remover é decisão do gerente.
clienteRoutes.post("/", clienteController.criar);
clienteRoutes.get("/", clienteController.listar);
clienteRoutes.get("/:id", clienteController.buscarPorId);
clienteRoutes.patch("/:id", clienteController.atualizar);
clienteRoutes.delete("/:id", soGerente, clienteController.remover);

// Histórico de pedidos do cliente (regra de negócio 4.1)
clienteRoutes.get("/:id/pedidos", pedidoController.listarPorCliente);

export default clienteRoutes;
