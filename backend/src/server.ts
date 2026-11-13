import { environment } from "./config/env.js";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { garantirAdministradorInicial } from "./services/auth.service.js";

//SECTION - Configurando porta (env ou default 3000)

const port = environment.PORT;

//SECTION - Iniciando servidor HTTP
const server = app.listen(port, () => {
  logger.info("servidor no ar", { porta: port, ambiente: environment.NODE_ENV });
});

//SECTION - Gerente inicial (ver services/auth.service.ts)
// Se o banco ainda não estiver aceitando conexões, tenta de novo a cada 5s
// em vez de derrubar o processo: o /health já responde 503 enquanto isso.
async function prepararAcessoInicial(): Promise<void> {
  try {
    await garantirAdministradorInicial();
  } catch (erro) {
    logger.error("falha ao verificar o gerente inicial; nova tentativa em 5s", {
      erro,
    });
    setTimeout(prepararAcessoInicial, 5000).unref();
  }
}
void prepararAcessoInicial();

//SECTION - Encerramento
const PRAZO_PARA_ENCERRAR_MS = 10_000;
let encerrando = false;

const shutdown = () => {
  if (encerrando) return;
  encerrando = true;
  logger.info("sinal de encerramento recebido; finalizando requisições em andamento");

  // server.close espera as conexões abertas terminarem. Se alguma ficar
  // pendurada, este prazo garante que o processo saia mesmo assim (antes de
  // o Docker perder a paciência e matá-lo à força).
  setTimeout(() => {
    logger.error("prazo de encerramento esgotado; saindo à força");
    process.exit(1);
  }, PRAZO_PARA_ENCERRAR_MS).unref();

  server.close(async () => {
    await prisma.$disconnect();
    logger.info("servidor encerrado");
    process.exit(0);
  });
};

// Ouvindo sinais do sistema operacional (Docker, Kubernetes, terminal)
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
