import cors from "cors";
import express from "express";
import { environment } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();
app.use(cors({ origin: environment.CORS_ORIGIN }));
app.use(express.json());

//SECTION - definindo os prefixos de rotas
app.use(routes);

app.use(errorHandler);

//SECTION - exportando o modulo para os server.js
export default app;
