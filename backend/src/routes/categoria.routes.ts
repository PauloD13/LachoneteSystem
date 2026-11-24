import { Router } from "express";
import * as categoriaController from "../controllers/categoria.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

const categoriaRoutes = Router();

// Consulta: qualquer funcionário logado. Alteração: só gerente.
categoriaRoutes.get("/", categoriaController.listar);
categoriaRoutes.get("/:id", categoriaController.buscarPorId);
categoriaRoutes.post("/", soGerente, categoriaController.criar);
categoriaRoutes.patch("/:id", soGerente, categoriaController.atualizar);
categoriaRoutes.delete("/:id", soGerente, categoriaController.remover);

export default categoriaRoutes;
