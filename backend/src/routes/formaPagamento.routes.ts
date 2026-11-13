import { Router } from "express";
import * as formaPagamentoController from "../controllers/formaPagamento.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

const formaPagamentoRoutes = Router();

// Consulta: qualquer funcionário logado. Alteração: só gerente.
formaPagamentoRoutes.get("/", formaPagamentoController.listar);
formaPagamentoRoutes.get("/:id", formaPagamentoController.buscarPorId);
formaPagamentoRoutes.post("/", soGerente, formaPagamentoController.criar);
formaPagamentoRoutes.patch("/:id", soGerente, formaPagamentoController.atualizar);
formaPagamentoRoutes.delete("/:id", soGerente, formaPagamentoController.remover);

export default formaPagamentoRoutes;
