import { Router } from "express";
import * as formaPagamentoController from "../controllers/formaPagamento.controller.js";

const formaPagamentoRoutes = Router();

formaPagamentoRoutes.post("/", formaPagamentoController.criar);
formaPagamentoRoutes.get("/", formaPagamentoController.listar);
formaPagamentoRoutes.get("/:id", formaPagamentoController.buscarPorId);
formaPagamentoRoutes.patch("/:id", formaPagamentoController.atualizar);
formaPagamentoRoutes.delete("/:id", formaPagamentoController.remover);

export default formaPagamentoRoutes;
