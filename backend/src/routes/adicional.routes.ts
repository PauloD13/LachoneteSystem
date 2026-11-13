import { Router } from "express";
import * as adicionalController from "../controllers/adicional.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

const adicionalRoutes = Router();

// Consulta: qualquer funcionário logado. Alteração: só gerente.
adicionalRoutes.get("/", adicionalController.listar);
adicionalRoutes.get("/:id", adicionalController.buscarPorId);
adicionalRoutes.post("/", soGerente, adicionalController.criar);
adicionalRoutes.patch("/:id", soGerente, adicionalController.atualizar);
adicionalRoutes.delete("/:id", soGerente, adicionalController.remover);

export default adicionalRoutes;
