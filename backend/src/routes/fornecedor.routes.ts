import { Router } from "express";
import * as fornecedorController from "../controllers/fornecedor.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

const fornecedorRoutes = Router();

// Consulta: qualquer funcionário logado. Alteração: só gerente.
fornecedorRoutes.get("/", fornecedorController.listar);
fornecedorRoutes.get("/:id", fornecedorController.buscarPorId);
fornecedorRoutes.post("/", soGerente, fornecedorController.criar);
fornecedorRoutes.patch("/:id", soGerente, fornecedorController.atualizar);
fornecedorRoutes.delete("/:id", soGerente, fornecedorController.remover);

export default fornecedorRoutes;
