import type { UsuarioAutenticado } from "../middlewares/autenticacao.js";

// Acrescenta ao Request do Express os campos que os nossos middlewares
// preenchem. Sem isto o TypeScript recusaria `req.usuario`.
declare global {
  namespace Express {
    interface Request {
      /** Preenchido por `autenticar` (middlewares/autenticacao.ts). */
      usuario?: UsuarioAutenticado;
      /** Preenchido por `registrarRequisicao` (middlewares/registro.ts). */
      idRequisicao?: string;
    }
  }
}

export {};
