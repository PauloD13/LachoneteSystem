import { Router } from "express";
import * as cupomController from "../controllers/cupom.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

const cupomRoutes = Router();

// Consulta: qualquer funcionário logado. Alteração: só gerente.
cupomRoutes.get("/", cupomController.listar);
cupomRoutes.get("/:id", cupomController.buscarPorId);
cupomRoutes.post("/", soGerente, cupomController.criar);
cupomRoutes.patch("/:id", soGerente, cupomController.atualizar);
cupomRoutes.delete("/:id", soGerente, cupomController.remover);

export default cupomRoutes;
