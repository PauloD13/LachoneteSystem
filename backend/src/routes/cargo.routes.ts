import { Router } from "express";
import * as cargoController from "../controllers/cargo.controller.js";

const cargoRoutes = Router();

cargoRoutes.post("/", cargoController.criar);
cargoRoutes.get("/", cargoController.listar);
cargoRoutes.get("/:id", cargoController.buscarPorId);
cargoRoutes.patch("/:id", cargoController.atualizar);
cargoRoutes.delete("/:id", cargoController.remover);

export default cargoRoutes;
