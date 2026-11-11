import { Router } from "express";
import type { Request, Response } from "express";
import clienteRoutes from "./cliente.routes.js";
import categoriaRoutes from "./categoria.routes.js";
import produtoRoutes from "./produto.routes.js";
import comboRoutes from "./combo.routes.js";
import adicionalRoutes from "./adicional.routes.js";
import fornecedorRoutes from "./fornecedor.routes.js";
import ingredienteRoutes from "./ingrediente.routes.js";
import funcionarioRoutes from "./funcionario.routes.js";
import cargoRoutes from "./cargo.routes.js";
import mesaRoutes from "./mesa.routes.js";
import formaPagamentoRoutes from "./formaPagamento.routes.js";
import promocaoRoutes from "./promocao.routes.js";
import cupomRoutes from "./cupom.routes.js";
import pedidoRoutes from "./pedido.routes.js";
import relatorioRoutes from "./relatorio.routes.js";

const router = Router();

// Healthcheck da API
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Registro de módulos por prefixo de recurso
// Cadastros
router.use("/clientes", clienteRoutes);
router.use("/funcionarios", funcionarioRoutes);
router.use("/cargos", cargoRoutes);
router.use("/mesas", mesaRoutes);
router.use("/formas-pagamento", formaPagamentoRoutes);

// Cardápio
router.use("/categorias", categoriaRoutes);
router.use("/produtos", produtoRoutes);
router.use("/combos", comboRoutes);
router.use("/adicionais", adicionalRoutes);
router.use("/promocoes", promocaoRoutes);
router.use("/cupons", cupomRoutes);

// Estoque
router.use("/fornecedores", fornecedorRoutes);
router.use("/ingredientes", ingredienteRoutes);

// Operação
router.use("/pedidos", pedidoRoutes);
router.use("/relatorios", relatorioRoutes);

export default router;
