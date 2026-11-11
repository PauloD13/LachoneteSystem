import { Router } from "express";
import * as comboController from "../controllers/combo.controller.js";

const comboRoutes = Router();

comboRoutes.post("/", comboController.criar);
comboRoutes.get("/", comboController.listar);
comboRoutes.get("/:id", comboController.buscarPorId);
comboRoutes.patch("/:id", comboController.atualizar);
comboRoutes.delete("/:id", comboController.remover);

export default comboRoutes;
