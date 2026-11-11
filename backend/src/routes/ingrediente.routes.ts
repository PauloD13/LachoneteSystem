import { Router } from "express";
import * as ingredienteController from "../controllers/ingrediente.controller.js";

const ingredienteRoutes = Router();

ingredienteRoutes.post("/", ingredienteController.criar);
ingredienteRoutes.get("/", ingredienteController.listar);
ingredienteRoutes.get("/:id", ingredienteController.buscarPorId);
ingredienteRoutes.patch("/:id", ingredienteController.atualizar);
ingredienteRoutes.delete("/:id", ingredienteController.remover);

export default ingredienteRoutes;
