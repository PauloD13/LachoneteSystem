import { Router } from "express";
import * as cargoController from "../controllers/cargo.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

const cargoRoutes = Router();

// Consulta: qualquer funcionário logado. Alteração: só gerente.
cargoRoutes.get("/", cargoController.listar);
cargoRoutes.get("/:id", cargoController.buscarPorId);
cargoRoutes.post("/", soGerente, cargoController.criar);
cargoRoutes.patch("/:id", soGerente, cargoController.atualizar);
cargoRoutes.delete("/:id", soGerente, cargoController.remover);

export default cargoRoutes;
