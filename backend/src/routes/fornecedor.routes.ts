import { Router } from "express";
import * as fornecedorController from "../controllers/fornecedor.controller.js";

const fornecedorRoutes = Router();

fornecedorRoutes.post("/", fornecedorController.criar);
fornecedorRoutes.get("/", fornecedorController.listar);
fornecedorRoutes.get("/:id", fornecedorController.buscarPorId);
fornecedorRoutes.patch("/:id", fornecedorController.atualizar);
fornecedorRoutes.delete("/:id", fornecedorController.remover);

export default fornecedorRoutes;
