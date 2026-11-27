import type { NextFunction, Request, RequestHandler, Response } from "express";
import helmet from "helmet";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { environment } from "../config/env.js";

// Cabeçalhos padrão do helmet (e sem "X-Powered-By"). HSTS e
// "upgrade-insecure-requests" ficam desligados porque o deploy da sala é
// HTTP: com eles o navegador trocaria http:// por https:// e o frontend não
// carregaria. Com HTTPS na frente, basta remover as duas linhas.
//
// A CSP só libera o próprio servidor: fontes, scripts e imagens vêm todos
// daqui (as fontes são empacotadas no build, sem CDN). frame-ancestors
// 'none' impede que outro site abra o sistema num iframe para enganar o
// clique (clickjacking).
const helmetComCsp = helmet({
  hsts: false,
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "font-src": ["'self'", "data:"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'"],
      "frame-ancestors": ["'none'"],
      "form-action": ["'self'"],
      "base-uri": ["'self'"],
      "object-src": ["'none'"],
      "upgrade-insecure-requests": null,
    },
  },
});

// O sistema não usa câmera, microfone, localização nem pagamento do
// navegador: o Permissions-Policy desliga esses recursos para qualquer
// script. X-Robots-Tag: sistema interno, fora dos buscadores (ver também
// robots.txt).
const PERMISSOES =
  "camera=(), microphone=(), geolocation=(), payment=(), usb=()";

export const cabecalhosDeSeguranca: RequestHandler = (req, res, next) => {
  res.setHeader("Permissions-Policy", PERMISSOES);
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  helmetComCsp(req, res, next);
};

/**
 * Respostas da API trazem dados pessoais (clientes, funcionários): nada de
 * guardar em cache do navegador ou de proxies. A foto do produto define o
 * próprio cache, depois deste cabeçalho.
 */
export const semCacheNaApi: RequestHandler = (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
};

const semLimite: RequestHandler = (_req, _res, next) => next();

function responder429(mensagem: string) {
  return (_req: Request, res: Response, _next: NextFunction) => {
    res.status(429).json({ error: mensagem });
  };
}

// Limite geral por IP, contado na memória (basta para um container; com
// réplicas seria preciso Redis). No Docker Desktop (Windows/macOS) toda a
// rede chega com o IP do gateway: com a turma inteira usando, aumente
// LIMITE_REQUISICOES_POR_MINUTO.
export const limiteGlobal: RequestHandler =
  environment.LIMITE_REQUISICOES_POR_MINUTO === 0
    ? semLimite
    : rateLimit({
        windowMs: 60 * 1000,
        limit: environment.LIMITE_REQUISICOES_POR_MINUTO,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        // O healthcheck do Docker bate aqui a cada poucos segundos.
        skip: (req) => req.path === "/api/health",
        handler: responder429(
          "Muitas requisições em pouco tempo. Aguarde um instante e tente de novo.",
        ),
      });

// Login: conta só tentativas que falharam, por IP + login — quem erra a
// própria senha não bloqueia os colegas do mesmo IP.
export const limiteDeLogin: RequestHandler =
  environment.LIMITE_TENTATIVAS_LOGIN === 0
    ? semLimite
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: environment.LIMITE_TENTATIVAS_LOGIN,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        keyGenerator: (req) => {
          const corpo = req.body as { login?: unknown } | undefined;
          const login =
            typeof corpo?.login === "string"
              ? corpo.login.trim().toLowerCase().slice(0, 50)
              : "";
          return `${ipKeyGenerator(req.ip ?? "")}|${login}`;
        },
        handler: responder429(
          "Muitas tentativas de login. Aguarde alguns minutos e tente de novo.",
        ),
      });
