import { Router } from "express";
import * as ingredienteController from "../controllers/ingrediente.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

const ingredienteRoutes = Router();

// Consulta: qualquer funcionário logado. Alteração: só gerente.
ingredienteRoutes.get("/", ingredienteController.listar);
ingredienteRoutes.get("/:id", ingredienteController.buscarPorId);
ingredienteRoutes.post("/", soGerente, ingredienteController.criar);
ingredienteRoutes.patch("/:id", soGerente, ingredienteController.atualizar);
ingredienteRoutes.delete("/:id", soGerente, ingredienteController.remover);

export default ingredienteRoutes;
