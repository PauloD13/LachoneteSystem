import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { autenticar } from "../middlewares/autenticacao.js";
import { limiteDeLogin } from "../middlewares/seguranca.js";

const authRoutes = Router();

// Única rota de negócio pública da API.
authRoutes.post("/login", limiteDeLogin, authController.login);

authRoutes.get("/me", autenticar, authController.eu);
authRoutes.patch("/senha", autenticar, authController.trocarSenha);

export default authRoutes;
