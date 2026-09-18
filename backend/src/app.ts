import express from "express";

const app = express();
app.use(express.json());

//SECTION - definindo os prefixos de rotas

//SECTION - exportando o modulo para os server.js
export default app;