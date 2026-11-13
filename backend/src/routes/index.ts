import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { autenticar } from "../middlewares/autenticacao.js";
import authRoutes from "./auth.routes.js";
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

// -----------------------------------------------------------------------------
// Rotas públicas
// -----------------------------------------------------------------------------

// Healthcheck: "a API está no ar E consegue falar com o banco?". É o que o
// Docker consulta (ver healthcheck em docker-compose.yml). Sem a consulta ao
// banco, responderia 200 mesmo com o sistema inutilizável.
const PRAZO_DO_BANCO_MS = 2000;

router.get("/health", async (_req: Request, res: Response) => {
  let prazo: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_resolve, reject) => {
        prazo = setTimeout(
          () => reject(new Error("banco não respondeu a tempo")),
          PRAZO_DO_BANCO_MS,
        );
      }),
    ]);
    res.status(200).json({ status: "ok", banco: "ok", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({
      status: "indisponivel",
      banco: "fora do ar",
      timestamp: new Date().toISOString(),
    });
  } finally {
    clearTimeout(prazo);
  }
});

router.use("/auth", authRoutes);

// -----------------------------------------------------------------------------
// Daqui para baixo, tudo exige login.
//
// Regra geral de AUTORIZAÇÃO (detalhada em cada arquivo de rotas):
//   - consultar (GET): qualquer funcionário logado;
//   - operar pedidos e cadastrar clientes: qualquer funcionário logado;
//   - criar/alterar/remover cadastros e ver relatórios: só gerente.
// -----------------------------------------------------------------------------
router.use(autenticar);

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
