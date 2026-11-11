import { Router } from "express";
import * as relatorioController from "../controllers/relatorio.controller.js";

const relatorioRoutes = Router();

// Todos exigem ?dataInicio=AAAA-MM-DD&dataFim=AAAA-MM-DD
relatorioRoutes.get("/mais-vendidos", relatorioController.maisVendidos);
relatorioRoutes.get(
  "/consumo-ingredientes",
  relatorioController.consumoIngredientes,
);
relatorioRoutes.get(
  "/vendas-por-atendente",
  relatorioController.vendasPorAtendente,
);

export default relatorioRoutes;
