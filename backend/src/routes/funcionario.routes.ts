import { Router } from "express";
import * as funcionarioController from "../controllers/funcionario.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";
import funcionarioCargoRoutes from "./funcionarioCargo.routes.js";

const funcionarioRoutes = Router();

// Consulta: qualquer funcionário logado (o atendente precisa, por exemplo,
// listar os entregadores). Alteração — inclusive login e senha: só gerente.
funcionarioRoutes.get("/", funcionarioController.listar);
funcionarioRoutes.get("/:id", funcionarioController.buscarPorId);
funcionarioRoutes.post("/", soGerente, funcionarioController.criar);
funcionarioRoutes.patch("/:id", soGerente, funcionarioController.atualizar);
funcionarioRoutes.delete("/:id", soGerente, funcionarioController.remover);

// Sub-rota: /funcionarios/:funcionarioId/cargos
funcionarioRoutes.use("/:funcionarioId/cargos", funcionarioCargoRoutes);

export default funcionarioRoutes;
