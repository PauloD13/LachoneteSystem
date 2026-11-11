import { Router } from "express";
import * as mesaController from "../controllers/mesa.controller.js";

const mesaRoutes = Router();

mesaRoutes.post("/", mesaController.criar);
mesaRoutes.get("/", mesaController.listar);
mesaRoutes.get("/:id", mesaController.buscarPorId);
mesaRoutes.patch("/:id", mesaController.atualizar);
mesaRoutes.delete("/:id", mesaController.remover);

export default mesaRoutes;
