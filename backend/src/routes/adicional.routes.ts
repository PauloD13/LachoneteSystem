import { Router } from "express";
import * as adicionalController from "../controllers/adicional.controller.js";

const adicionalRoutes = Router();

adicionalRoutes.post("/", adicionalController.criar);
adicionalRoutes.get("/", adicionalController.listar);
adicionalRoutes.get("/:id", adicionalController.buscarPorId);
adicionalRoutes.patch("/:id", adicionalController.atualizar);
adicionalRoutes.delete("/:id", adicionalController.remover);

export default adicionalRoutes;
