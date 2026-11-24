import type { NextFunction, Request, RequestHandler, Response } from "express";
import helmet from "helmet";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { environment } from "../config/env.js";

// Cabeçalhos de segurança padrão (e remoção do "X-Powered-By: Express", que
// só serve para contar a um atacante qual tecnologia roda aqui).
//
// Dois padrões do helmet são desligados porque pressupõem HTTPS, e o deploy
// deste projeto (servidor local da sala) é HTTP:
//   - HSTS manda o navegador usar só HTTPS neste endereço;
//   - "upgrade-insecure-requests" faz o navegador trocar http:// por https://
//     em tudo que a página carrega — o que quebraria o frontend quando ele
//     for servido por este mesmo backend.
// Se um dia houver HTTPS na frente da API, basta remover as duas linhas.
//
// Atenção para a etapa do frontend: a Content-Security-Policy padrão bloqueia
// <script> inline e scripts de outros domínios (CDN). Use arquivos .js
// próprios ou ajuste as diretivas aqui.
export const cabecalhosDeSeguranca = helmet({
  hsts: false,
  contentSecurityPolicy: {
    directives: { "upgrade-insecure-requests": null },
  },
});

const semLimite: RequestHandler = (_req, _res, next) => next();

function responder429(mensagem: string) {
  return (_req: Request, res: Response, _next: NextFunction) => {
    res.status(429).json({ error: mensagem });
  };
}

// Limite geral por IP: freia scripts em loop e abuso da API como um todo.
//
// O contador fica na memória deste processo — suficiente para um único
// container. Com várias réplicas do backend seria preciso um armazenamento
// compartilhado (Redis).
//
// Em Docker Desktop (Windows/macOS) todas as máquinas da rede chegam ao
// container com o MESMO IP (o do gateway). Se a turma inteira for usar o
// sistema ao mesmo tempo nesse cenário, aumente LIMITE_REQUISICOES_POR_MINUTO.
export const limiteGlobal: RequestHandler =
  environment.LIMITE_REQUISICOES_POR_MINUTO === 0
    ? semLimite
    : rateLimit({
        windowMs: 60 * 1000,
        limit: environment.LIMITE_REQUISICOES_POR_MINUTO,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        // O healthcheck do Docker bate aqui a cada poucos segundos.
        skip: (req) => req.path === "/health",
        handler: responder429(
          "Muitas requisições em pouco tempo. Aguarde um instante e tente de novo.",
        ),
      });

// Limite do login: conta só as tentativas que FALHARAM, por IP + login.
// É o que impede adivinhar senha por tentativa e erro. A chave inclui o login
// para que alguém errando a própria senha não bloqueie os colegas que
// compartilham o mesmo IP.
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
