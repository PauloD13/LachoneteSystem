import { environment } from "../config/env.js";

// Log estruturado: em produção cada evento é UMA linha JSON na saída padrão.
// É o formato que o Docker coleta (`docker compose logs backend`) e que dá
// para filtrar depois (por status, por usuário, por id de requisição).
// Em desenvolvimento a mesma informação sai em texto, mais fácil de ler.
//
// Regra da casa: nunca registrar corpo de requisição, senha, token ou o
// cabeçalho Authorization.

type Nivel = "info" | "warn" | "error";
type Campos = Record<string, unknown>;

function serializarErro(erro: unknown): Campos {
  if (erro instanceof Error) {
    return { nome: erro.name, mensagem: erro.message, pilha: erro.stack };
  }
  return { mensagem: String(erro) };
}

function registrar(nivel: Nivel, mensagem: string, campos: Campos = {}) {
  const { erro, ...resto } = campos;
  const evento: Campos = {
    hora: new Date().toISOString(),
    nivel,
    mensagem,
    ...resto,
    ...(erro === undefined ? {} : { erro: serializarErro(erro) }),
  };

  const saida = nivel === "error" ? console.error : console.log;

  if (environment.NODE_ENV === "production") {
    saida(JSON.stringify(evento));
    return;
  }

  const detalhes = Object.entries(resto)
    .map(([chave, valor]) => `${chave}=${JSON.stringify(valor)}`)
    .join(" ");
  saida(`[${nivel}] ${mensagem}${detalhes ? " " + detalhes : ""}`);
  if (erro !== undefined) saida(erro);
}

export const logger = {
  info: (mensagem: string, campos?: Campos) => registrar("info", mensagem, campos),
  warn: (mensagem: string, campos?: Campos) => registrar("warn", mensagem, campos),
  error: (mensagem: string, campos?: Campos) => registrar("error", mensagem, campos),
};
