import { Router } from "express";
import * as produtoController from "../controllers/produto.controller.js";

const produtoRoutes = Router();

produtoRoutes.post("/", produtoController.criar);
produtoRoutes.get("/", produtoController.listar);
produtoRoutes.get("/:id", produtoController.buscarPorId);
produtoRoutes.patch("/:id", produtoController.atualizar);
produtoRoutes.delete("/:id", produtoController.remover);

export default produtoRoutes;
