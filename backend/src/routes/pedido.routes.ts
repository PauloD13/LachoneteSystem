import { Router } from "express";
import * as pedidoController from "../controllers/pedido.controller.js";

const pedidoRoutes = Router();

pedidoRoutes.post("/", pedidoController.criar);
pedidoRoutes.get("/", pedidoController.listar);
pedidoRoutes.get("/:id", pedidoController.buscarPorId);

// Pedido não tem PATCH/DELETE genéricos: depois de criado ele só muda pelas
// ações de negócio abaixo (um pedido errado é CANCELADO, não apagado).
pedidoRoutes.post("/:id/status", pedidoController.atualizarStatus);
pedidoRoutes.post("/:id/pagamentos", pedidoController.adicionarPagamento);
pedidoRoutes.patch("/:id/entrega", pedidoController.trocarEntregador);
pedidoRoutes.post("/:id/avaliacao", pedidoController.avaliar);

export default pedidoRoutes;
