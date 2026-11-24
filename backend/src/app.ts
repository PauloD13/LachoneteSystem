import cors from "cors";
import express from "express";
import { environment } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler, rotaNaoEncontrada } from "./middlewares/errorHandler.js";
import { registrarRequisicao } from "./middlewares/registro.js";
import { cabecalhosDeSeguranca, limiteGlobal } from "./middlewares/seguranca.js";

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
app.use(routes);

app.use(rotaNaoEncontrada);
app.use(errorHandler);

//SECTION - exportando o modulo para os server.js
export default app;
