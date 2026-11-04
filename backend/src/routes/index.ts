import { Router } from "express";
import type { Request, Response } from "express";
import clienteRoutes from "./cliente.routes.js";
import categoriaRoutes from "./categoria.routes.js";
import produtoRoutes from "./produto.routes.js";
import funcionarioRoutes from "./funcionario.routes.js";

const router = Router();

// Healthcheck da API
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Registro de módulos por prefixo de recurso
router.use("/clientes", clienteRoutes);
router.use("/categorias", categoriaRoutes);
router.use("/produtos", produtoRoutes);
router.use("/funcionarios", funcionarioRoutes);
// Futuros recursos:
// router.use('/pedidos', pedidoRoutes);

export default router;
