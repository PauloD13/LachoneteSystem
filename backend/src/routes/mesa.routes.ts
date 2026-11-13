import { Router } from "express";
import * as mesaController from "../controllers/mesa.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

const mesaRoutes = Router();

// Consulta: qualquer funcionário logado. Alteração: só gerente.
mesaRoutes.get("/", mesaController.listar);
mesaRoutes.get("/:id", mesaController.buscarPorId);
mesaRoutes.post("/", soGerente, mesaController.criar);
mesaRoutes.patch("/:id", soGerente, mesaController.atualizar);
mesaRoutes.delete("/:id", soGerente, mesaController.remover);

export default mesaRoutes;
