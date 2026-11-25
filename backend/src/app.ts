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
} from "./middlewares/seguranca.js";

const app = express();

// A ordem importa: cada requisição atravessa os middlewares de cima para baixo.
app.use(cabecalhosDeSeguranca);
app.use(registrarRequisicao);
// CORS antes do limite de requisições: assim até a resposta 429 sai com os
// cabeçalhos que deixam o navegador entregá-la ao frontend.
app.use(
  cors({ origin: environment.CORS_ORIGIN, exposedHeaders: ["X-Request-Id"] }),
);
app.use(limiteGlobal);
// 100kb é o padrão do express.json; fica explícito porque é uma decisão de
// segurança (corpo maior que isso é recusado com 413).
app.use(express.json({ limit: "100kb" }));

//SECTION - definindo os prefixos de rotas
// Toda a API fica sob /api. O resto dos caminhos é das telas do frontend
// (etapa F8): como API e telas vão morar no mesmo endereço, sem o prefixo
// a tela /clientes e a rota GET /clientes da API colidiriam — dar F5 na tela
// devolveria o JSON da API em vez da página.
app.use("/api", routes);

//SECTION - telas do frontend (quando compiladas; ver middlewares/frontend.ts)
const frontend = pastaDoFrontend();
if (frontend) app.use(servirFrontend(frontend));

app.use(rotaNaoEncontrada);
app.use(errorHandler);

//SECTION - exportando o modulo para os server.js
export default app;
