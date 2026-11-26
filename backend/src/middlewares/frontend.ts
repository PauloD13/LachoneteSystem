import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import type { RequestHandler } from "express";
import { environment } from "../config/env.js";
import { logger } from "../lib/logger.js";

// O enunciado (5.4) pede que o container do backend sirva o frontend:
//   /api/...           -> API (registrada antes deste middleware)
//   /assets/index-x.js -> arquivo estático
//   qualquer outra rota -> index.html (o React Router decide a tela)
// Em desenvolvimento não há build: as telas vêm do Vite, que repassa /api.

/** Pasta das telas compiladas, ou `null` se não houver (desenvolvimento). */
export function pastaDoFrontend(): string | null {
  const pasta = path.resolve(
    environment.FRONTEND_DIR ?? path.join(import.meta.dirname, "../../public"),
  );
  if (!existsSync(path.join(pasta, "index.html"))) return null;
  logger.info("servindo o frontend", { pasta });
  return pasta;
}

export function servirFrontend(pasta: string): RequestHandler[] {
  const indice = path.join(pasta, "index.html");

  const arquivos = express.static(pasta, {
    // "/" cai no fallback abaixo, com o cabeçalho de cache do index.html.
    index: false,
    setHeaders(res, caminho) {
      // Nomes com hash (index-Dvim0oF7.js) nunca mudam de conteúdo.
      if (caminho.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  });

  const paginaDoApp: RequestHandler = (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    // Rota da API que não existe continua respondendo 404 em JSON.
    if (req.path === "/api" || req.path.startsWith("/api/")) return next();
    // Arquivo inexistente (um .js de build antigo) é 404, não HTML: o
    // navegador tentaria executar o HTML como script.
    if (path.extname(req.path) !== "") return next();

    // Sem cache: é o index.html que aponta para os arquivos do build atual.
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indice);
  };

  return [arquivos, paginaDoApp];
}
