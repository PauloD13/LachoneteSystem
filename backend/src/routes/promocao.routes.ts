import { Router } from "express";
import * as promocaoController from "../controllers/promocao.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

const promocaoRoutes = Router();

// Consulta: qualquer funcionário logado. Alteração: só gerente.
promocaoRoutes.get("/", promocaoController.listar);
promocaoRoutes.get("/:id", promocaoController.buscarPorId);
promocaoRoutes.post("/", soGerente, promocaoController.criar);
promocaoRoutes.patch("/:id", soGerente, promocaoController.atualizar);
promocaoRoutes.delete("/:id", soGerente, promocaoController.remover);

export default promocaoRoutes;
