import { Router } from "express";
import * as variacaoController from "../controllers/variacao.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

// Montado em /produtos/:produtoId/variacoes (ver produto.routes.ts).
const variacaoRoutes = Router({ mergeParams: true });

variacaoRoutes.get("/", variacaoController.listar);
variacaoRoutes.post("/", soGerente, variacaoController.criar);
variacaoRoutes.patch("/:variacaoId", soGerente, variacaoController.atualizar);
variacaoRoutes.delete("/:variacaoId", soGerente, variacaoController.remover);

export default variacaoRoutes;
