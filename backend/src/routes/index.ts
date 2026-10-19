import { Router } from "express";
import type { Request, Response } from "express";
import clienteRoutes from "./cliente.routes.js";

const router = Router();

// Healthcheck da API
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Registro de módulos por prefixo de recurso
router.use("/clientes", clienteRoutes);
// Futuros recursos:
// router.use('/produtos', produtoRoutes);
// router.use('/pedidos', pedidoRoutes);

export default router;
