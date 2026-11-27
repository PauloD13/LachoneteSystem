import cors from "cors";
import express from "express";
import { environment } from "./config/env.js";
import routes from "./routes/index.js";
import { pastaDoFrontend, servirFrontend } from "./middlewares/frontend.js";
import { errorHandler, rotaNaoEncontrada } from "./middlewares/errorHandler.js";
import { registrarRequisicao } from "./middlewares/registro.js";
import {
  cabecalhosDeSeguranca,
  limiteGlobal,
  semCacheNaApi,
} from "./middlewares/seguranca.js";

const app = express();

// A ordem importa.
app.use(cabecalhosDeSeguranca);
app.use(registrarRequisicao);
// CORS antes do limite: até a resposta 429 precisa chegar ao frontend.
app.use(
  cors({ origin: environment.CORS_ORIGIN, exposedHeaders: ["X-Request-Id"] }),
);
app.use(limiteGlobal);
// O padrão, mas explícito: é decisão de segurança (corpo maior recebe 413).
app.use(express.json({ limit: "100kb" }));

//SECTION - rotas da API
// Sob /api porque telas e API dividem o endereço: sem o prefixo, F5 na tela
// /clientes devolveria o JSON de GET /clientes.
app.use("/api", semCacheNaApi, routes);

//SECTION - telas do frontend (quando compiladas)
const frontend = pastaDoFrontend();
if (frontend) app.use(servirFrontend(frontend));

app.use(rotaNaoEncontrada);
app.use(errorHandler);

export default app;
