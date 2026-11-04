import { Router } from "express";
import * as categoriaController from "../controllers/categoria.controller.js";

const categoriaRoutes = Router();

categoriaRoutes.post("/", categoriaController.criar);
categoriaRoutes.get("/", categoriaController.listar);
categoriaRoutes.get("/:id", categoriaController.buscarPorId);
categoriaRoutes.patch("/:id", categoriaController.atualizar);
categoriaRoutes.delete("/:id", categoriaController.remover);

export default categoriaRoutes;