import express, { Router } from "express";
import * as produtoController from "../controllers/produto.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";
import variacaoRoutes from "./variacao.routes.js";
import fichaTecnicaRoutes from "./fichaTecnica.routes.js";

const produtoRoutes = Router();

// Consulta: qualquer funcionário logado. Alteração: só gerente.
produtoRoutes.get("/", produtoController.listar);
produtoRoutes.get("/:id", produtoController.buscarPorId);
produtoRoutes.post("/", soGerente, produtoController.criar);
produtoRoutes.patch("/:id", soGerente, produtoController.atualizar);
produtoRoutes.delete("/:id", soGerente, produtoController.remover);
produtoRoutes.put(
  "/:id/foto",
  soGerente,
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp"],
    limit: "512kb",
  }),
  produtoController.enviarFoto,
);
produtoRoutes.delete("/:id/foto", soGerente, produtoController.removerFoto);

// Sub-rotas: /produtos/:produtoId/variacoes e /produtos/:produtoId/ingredientes
produtoRoutes.use("/:produtoId/variacoes", variacaoRoutes);
produtoRoutes.use("/:produtoId/ingredientes", fichaTecnicaRoutes);

export default produtoRoutes;
