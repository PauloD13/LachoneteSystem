import { Router } from "express";
import * as produtoController from "../controllers/produto.controller.js";
import variacaoRoutes from "./variacao.routes.js";
import fichaTecnicaRoutes from "./fichaTecnica.routes.js";

const produtoRoutes = Router();

produtoRoutes.post("/", produtoController.criar);
produtoRoutes.get("/", produtoController.listar);
produtoRoutes.get("/:id", produtoController.buscarPorId);
produtoRoutes.patch("/:id", produtoController.atualizar);
produtoRoutes.delete("/:id", produtoController.remover);

// Sub-rotas: /produtos/:produtoId/variacoes e /produtos/:produtoId/ingredientes
produtoRoutes.use("/:produtoId/variacoes", variacaoRoutes);
produtoRoutes.use("/:produtoId/ingredientes", fichaTecnicaRoutes);

export default produtoRoutes;
