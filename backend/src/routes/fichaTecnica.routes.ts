import { Router } from "express";
import * as fichaTecnicaController from "../controllers/fichaTecnica.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

// Montado em /produtos/:produtoId/ingredientes (ver produto.routes.ts).
const fichaTecnicaRoutes = Router({ mergeParams: true });

fichaTecnicaRoutes.get("/", fichaTecnicaController.listar);
fichaTecnicaRoutes.put("/:ingredienteId", soGerente, fichaTecnicaController.definir);
fichaTecnicaRoutes.delete("/:ingredienteId", soGerente, fichaTecnicaController.remover);

export default fichaTecnicaRoutes;
