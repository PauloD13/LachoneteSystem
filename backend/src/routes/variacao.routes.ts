import { Router } from "express";
import * as variacaoController from "../controllers/variacao.controller.js";

// Montado em /produtos/:produtoId/variacoes (ver produto.routes.ts).
const variacaoRoutes = Router({ mergeParams: true });

variacaoRoutes.post("/", variacaoController.criar);
variacaoRoutes.get("/", variacaoController.listar);
variacaoRoutes.patch("/:variacaoId", variacaoController.atualizar);
variacaoRoutes.delete("/:variacaoId", variacaoController.remover);

export default variacaoRoutes;
