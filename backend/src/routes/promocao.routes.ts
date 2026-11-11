import { Router } from "express";
import * as promocaoController from "../controllers/promocao.controller.js";

const promocaoRoutes = Router();

promocaoRoutes.post("/", promocaoController.criar);
promocaoRoutes.get("/", promocaoController.listar);
promocaoRoutes.get("/:id", promocaoController.buscarPorId);
promocaoRoutes.patch("/:id", promocaoController.atualizar);
promocaoRoutes.delete("/:id", promocaoController.remover);

export default promocaoRoutes;
