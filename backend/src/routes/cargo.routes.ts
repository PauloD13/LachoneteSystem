import { Router } from "express";
import * as cargoController from "../controllers/cargo.controller.js";

const categoriaRoutes = Router();

categoriaRoutes.post("/", cargoController.criar);
categoriaRoutes.get("/", cargoController.listar);
categoriaRoutes.get("/:id", cargoController.buscarPorId);
categoriaRoutes.patch("/:id", cargoController.atualizar);
categoriaRoutes.delete("/:id", cargoController.remover);

export default categoriaRoutes;