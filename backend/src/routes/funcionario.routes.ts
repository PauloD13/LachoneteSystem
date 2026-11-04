import { Router } from "express";
import * as funcionarioController from "../controllers/funcionario.controller.js";

const funcionarioRoutes = Router();

funcionarioRoutes.post("/", funcionarioController.criar);
funcionarioRoutes.get("/", funcionarioController.listar);
funcionarioRoutes.get("/:id", funcionarioController.buscarPorId);
funcionarioRoutes.patch("/:id", funcionarioController.atualizar);
funcionarioRoutes.delete("/:id", funcionarioController.remover);

export default funcionarioRoutes;