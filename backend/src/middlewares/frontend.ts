import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import type { RequestHandler } from "express";
import { environment } from "../config/env.js";
import { logger } from "../lib/logger.js";

// O enunciado (5.4) pede que o container do backend sirva o frontend. Aqui
// o Express entrega as telas compiladas pelo Vite, no mesmo endereço da API:
//
//   /api/...           -> API (registrada antes deste middleware)
//   /assets/index-x.js -> arquivo estático
//   /clientes, /pedidos/12, ... (telas) -> index.html; o React Router, já no
//                         navegador, decide o que mostrar
//
// Em desenvolvimento a pasta não existe e nada disto é ativado: as telas
// vêm do Vite (npm run dev no frontend), que repassa /api para cá.

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
    // "/" também cai no fallback abaixo, para receber o mesmo cabeçalho de
    // cache do index.html.
    index: false,
    setHeaders(res, caminho) {
      // O Vite põe um hash no nome dos arquivos de assets/ (index-Dvim0oF7.js):
      // o conteúdo de um nome nunca muda, então o navegador pode guardá-lo
      // para sempre. Um build novo gera nomes novos.
      if (caminho.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  });

  const paginaDoApp: RequestHandler = (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    // Rota da API que não existe continua respondendo 404 em JSON.
    if (req.path === "/api" || req.path.startsWith("/api/")) return next();
    // Pedido de ARQUIVO que não existe (ex.: um .js de um build antigo): 404,
    // e não o HTML — o navegador tentaria executar o HTML como script.
    if (path.extname(req.path) !== "") return next();

    // index.html nunca vai para o cache: é ele que aponta para os arquivos
    // do build atual.
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indice);
  };

  return [arquivos, paginaDoApp];
}
