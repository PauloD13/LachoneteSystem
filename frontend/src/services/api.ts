// Cliente HTTP do sistema: TODA conversa com o backend passa por aqui.
//
// Responsabilidades, para as telas não precisarem repetir:
//   - prefixo /api e montagem da query string;
//   - cabeçalho Authorization com o token do login;
//   - converter o corpo JSON (e o 204 "sem conteúdo");
//   - transformar qualquer falha em um ErroDaApi com mensagem para o usuário;
//   - avisar a aplicação quando a sessão expirou (401), para voltar ao login.

import type { CorpoDeErro } from "../types/api";

const PREFIXO = "/api";

/** Erro de uma chamada à API, pronto para ser mostrado na tela. */
export class ErroDaApi extends Error {
  /** Status HTTP; 0 quando nem foi possível falar com o servidor. */
  readonly status: number;
  /** Mensagens de validação por campo (respostas 400). */
  readonly campos: Record<string, string[] | undefined>;

  constructor(
    status: number,
    mensagem: string,
    campos: CorpoDeErro["details"] = {},
  ) {
    super(mensagem);
    this.name = "ErroDaApi";
    this.status = status;
    this.campos = campos;
  }

  /** Primeira mensagem de validação de um campo, ou `undefined`. */
  doCampo(campo: string): string | undefined {
    return this.campos[campo]?.[0];
  }
}

/** Mensagem amigável para qualquer erro (da API ou não). */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroDaApi) return erro.message;
  return "Ocorreu um erro inesperado. Tente novamente.";
}

// --- Sessão -------------------------------------------------------------------
// O token fica em memória aqui; quem decide onde guardá-lo entre recargas
// da página é o AuthContext (contexts/AuthProvider.tsx).

let token: string | null = null;
let aoExpirarSessao: (() => void) | null = null;

export function definirToken(novo: string | null): void {
  token = novo;
}

/** Chamado quando uma requisição autenticada recebe 401. */
export function definirAoExpirarSessao(callback: (() => void) | null): void {
  aoExpirarSessao = callback;
}

// --- Requisição -----------------------------------------------------------------

type ValorDeConsulta = string | number | boolean | null | undefined;

export interface OpcoesDeRequisicao {
  /** Corpo enviado como JSON. */
  corpo?: unknown;
  /** Query string; valores `undefined`, `null` e "" são omitidos. */
  consulta?: Record<string, ValorDeConsulta>;
  /** Para cancelar a requisição (ex.: a tela foi fechada antes da resposta). */
  sinal?: AbortSignal;
}

export function montarConsulta(
  consulta: Record<string, ValorDeConsulta> = {},
): string {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(consulta)) {
    if (valor === undefined || valor === null || valor === "") continue;
    parametros.set(chave, String(valor));
  }
  const texto = parametros.toString();
  return texto ? `?${texto}` : "";
}

async function lerCorpo(resposta: Response): Promise<unknown> {
  const texto = await resposta.text();
  if (!texto) return undefined;
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

function mensagemPadrao(status: number): string {
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  if (status === 403) return "Você não tem permissão para esta ação.";
  if (status === 404) return "Registro não encontrado.";
  if (status === 429) return "Muitas tentativas. Aguarde um instante.";
  if (status >= 500)
    return "O servidor está com problemas. Tente em instantes.";
  return "Não foi possível concluir a operação.";
}

export async function requisitar<T>(
  metodo: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  caminho: string,
  { corpo, consulta, sinal }: OpcoesDeRequisicao = {},
): Promise<T> {
  const cabecalhos: Record<string, string> = { Accept: "application/json" };
  if (corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
  if (token) cabecalhos.Authorization = `Bearer ${token}`;

  let resposta: Response;
  try {
    resposta = await fetch(`${PREFIXO}${caminho}${montarConsulta(consulta)}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: sinal,
    });
  } catch (erro) {
    // Cancelamento proposital: deixa passar como está, para quem cancelou
    // poder ignorá-lo (ver hooks/useConsulta.ts).
    if (erro instanceof DOMException && erro.name === "AbortError") throw erro;
    throw new ErroDaApi(
      0,
      "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  }

  const conteudo = await lerCorpo(resposta);

  if (!resposta.ok) {
    const corpoDeErro = (
      typeof conteudo === "object" && conteudo !== null ? conteudo : {}
    ) as Partial<CorpoDeErro>;

    // 401 numa requisição que levava token = sessão expirada/revogada.
    // (No próprio login, 401 é só "senha errada" e não desloga ninguém.)
    if (resposta.status === 401 && token) aoExpirarSessao?.();

    throw new ErroDaApi(
      resposta.status,
      corpoDeErro.error ?? mensagemPadrao(resposta.status),
      corpoDeErro.details,
    );
  }

  return conteudo as T;
}

/** Atalhos: api.get<Produto[]>("/produtos"), api.post(...), etc. */
export const api = {
  get: <T>(caminho: string, opcoes?: Omit<OpcoesDeRequisicao, "corpo">) =>
    requisitar<T>("GET", caminho, opcoes),
  post: <T>(caminho: string, corpo?: unknown, opcoes?: OpcoesDeRequisicao) =>
    requisitar<T>("POST", caminho, { ...opcoes, corpo }),
  put: <T>(caminho: string, corpo?: unknown, opcoes?: OpcoesDeRequisicao) =>
    requisitar<T>("PUT", caminho, { ...opcoes, corpo }),
  patch: <T>(caminho: string, corpo?: unknown, opcoes?: OpcoesDeRequisicao) =>
    requisitar<T>("PATCH", caminho, { ...opcoes, corpo }),
  delete: (caminho: string, opcoes?: OpcoesDeRequisicao) =>
    requisitar<void>("DELETE", caminho, opcoes),
};
