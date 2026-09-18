import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middlewares/asyncHandler";

export const router = Router();

// Endpoint de verificação de saúde: confirma que a API está no ar e que a
// conexão com o banco está funcionando (usado pelo healthcheck do Docker
// Compose e para diagnóstico manual).
router.get(
  "/health",
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  }),
);

// Routers de domínio (cliente, produto, pedido, etc.) serão registrados
// aqui conforme forem implementados.
