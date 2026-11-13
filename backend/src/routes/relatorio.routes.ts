import { Router } from "express";
import * as relatorioController from "../controllers/relatorio.controller.js";
import { soGerente } from "../middlewares/autenticacao.js";

const relatorioRoutes = Router();

// Faturamento, comissões e consumo são informação gerencial.
relatorioRoutes.use(soGerente);

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
