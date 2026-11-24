import { Router } from "express";
import * as funcionarioCargoController from "../controllers/funcionarioCargo.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

// mergeParams: true é obrigatório — esse router é montado dentro de
// funcionario.routes.ts em "/:funcionarioId/cargos", e sem essa opção
// req.params.funcionarioId não chegaria até aqui.
const funcionarioCargoRoutes = Router({ mergeParams: true });

// Atribuir ou encerrar um cargo muda o que a pessoa pode fazer no sistema:
// só gerente.
funcionarioCargoRoutes.get("/", funcionarioCargoController.listar);
funcionarioCargoRoutes.post("/", soGerente, funcionarioCargoController.abrir);
funcionarioCargoRoutes.patch("/:vinculoId", soGerente, funcionarioCargoController.encerrar);

export default funcionarioCargoRoutes;
