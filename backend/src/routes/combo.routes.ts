import { Router } from "express";
import * as comboController from "../controllers/combo.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

const comboRoutes = Router();

// Consulta: qualquer funcionário logado. Alteração: só gerente.
comboRoutes.get("/", comboController.listar);
comboRoutes.get("/:id", comboController.buscarPorId);
comboRoutes.post("/", soGerente, comboController.criar);
comboRoutes.patch("/:id", soGerente, comboController.atualizar);
comboRoutes.delete("/:id", soGerente, comboController.remover);

export default comboRoutes;
