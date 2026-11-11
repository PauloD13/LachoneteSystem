import { Router } from "express";
import * as fichaTecnicaController from "../controllers/fichaTecnica.controller.js";

// Montado em /produtos/:produtoId/ingredientes (ver produto.routes.ts).
const fichaTecnicaRoutes = Router({ mergeParams: true });

fichaTecnicaRoutes.get("/", fichaTecnicaController.listar);
fichaTecnicaRoutes.put("/:ingredienteId", fichaTecnicaController.definir);
fichaTecnicaRoutes.delete("/:ingredienteId", fichaTecnicaController.remover);

export default fichaTecnicaRoutes;
