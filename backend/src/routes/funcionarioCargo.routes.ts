import { Router } from "express";
import * as funcionarioCargoController from "../controllers/funcionarioCargo.controller.js";

// mergeParams: true é obrigatório — esse router é montado dentro de
// funcionario.routes.ts em "/:funcionarioId/cargos", e sem essa opção
// req.params.funcionarioId não chegaria até aqui.
const funcionarioCargoRoutes = Router({ mergeParams: true });

funcionarioCargoRoutes.post("/", funcionarioCargoController.abrir);
funcionarioCargoRoutes.get("/", funcionarioCargoController.listar);
funcionarioCargoRoutes.patch("/:vinculoId", funcionarioCargoController.encerrar);

export default funcionarioCargoRoutes;
