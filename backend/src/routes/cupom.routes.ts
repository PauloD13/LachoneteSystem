import { Router } from "express";
import * as cupomController from "../controllers/cupom.controller.js";

const cupomRoutes = Router();

cupomRoutes.post("/", cupomController.criar);
cupomRoutes.get("/", cupomController.listar);
cupomRoutes.get("/:id", cupomController.buscarPorId);
cupomRoutes.patch("/:id", cupomController.atualizar);
cupomRoutes.delete("/:id", cupomController.remover);

export default cupomRoutes;
