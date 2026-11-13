// Funções de apoio dos testes de ponta a ponta.
//
// Os testes falam com a API de verdade, por HTTP, do jeito que o frontend
// fará — não importam nada de src/. Por isso exercitam tudo junto: rotas,
// validação, regras de negócio, Prisma, triggers e constraints do Postgres.
//
// Pré-requisitos (ver README, seção "Testes automatizados"):
//   - API no ar (API_URL, padrão http://localhost:3000);
//   - banco criado pelos scripts de database/init (schema + seed);
//   - gerente inicial (ADMIN_LOGIN / ADMIN_SENHA, os mesmos da API).
//
// Cada teste cria os próprios dados, com nomes únicos: a suíte pode rodar
// várias vezes seguidas no mesmo banco.

import assert from "node:assert/strict";

const API_URL = process.env.API_URL ?? "http://localhost:3000";
const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? "admin";
const ADMIN_SENHA = process.env.ADMIN_SENHA ?? "admin12345";
const FUSO = process.env.APP_TIMEZONE ?? "America/Sao_Paulo";

export const SENHA_PADRAO = "senha-de-teste-123";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export interface Resposta {
  status: number;
  corpo: Json;
  cabecalhos: Headers;
}

interface Opcoes {
  token?: string;
  corpo?: unknown;
  /** Corpo enviado exatamente como está (para testar JSON inválido). */
  corpoBruto?: string;
}

export async function api(
  metodo: string,
  rota: string,
  { token, corpo, corpoBruto }: Opcoes = {},
): Promise<Resposta> {
  const cabecalhos: Record<string, string> = {};
  if (token) cabecalhos.authorization = `Bearer ${token}`;
  if (corpo !== undefined || corpoBruto !== undefined) {
    cabecalhos["content-type"] = "application/json";
  }

  const resposta = await fetch(`${API_URL}${rota}`, {
    method: metodo,
    headers: cabecalhos,
    body: corpoBruto ?? (corpo === undefined ? undefined : JSON.stringify(corpo)),
  });

  const texto = await resposta.text();
  let conteudo: Json = null;
  if (texto) {
    try {
      conteudo = JSON.parse(texto);
    } catch {
      conteudo = texto;
    }
  }
  return { status: resposta.status, corpo: conteudo, cabecalhos: resposta.headers };
}

/** Chama a API e exige o status esperado; devolve o corpo. */
export async function ok(
  esperado: number,
  metodo: string,
  rota: string,
  opcoes: Opcoes = {},
): Promise<Json> {
  const r = await api(metodo, rota, opcoes);
  assert.equal(
    r.status,
    esperado,
    `${metodo} ${rota} -> ${r.status} (esperado ${esperado}): ${JSON.stringify(r.corpo)}`,
  );
  return r.corpo;
}

let contador = 0;
/** Texto único por execução: evita colisão com dados de execuções anteriores. */
export function unico(prefixo: string): string {
  contador += 1;
  return `${prefixo}-${Date.now().toString(36)}${contador}`;
}

/** Dia (AAAA-MM-DD) no fuso do negócio, deslocado em `dias` a partir de hoje. */
export function dia(dias = 0): string {
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const data = new Date(`${hoje}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export async function entrar(login: string, senha: string): Promise<string> {
  const corpo = await ok(200, "POST", "/auth/login", { corpo: { login, senha } });
  return corpo.token;
}

let tokenDoGerente: Promise<string> | undefined;
export function gerente(): Promise<string> {
  tokenDoGerente ??= entrar(ADMIN_LOGIN, ADMIN_SENHA);
  return tokenDoGerente;
}

let cargos: Promise<Record<string, number>> | undefined;
/** Mapa nome -> id dos cargos cadastrados. */
export function idsDosCargos(): Promise<Record<string, number>> {
  cargos ??= (async () => {
    const lista = await ok(200, "GET", "/cargos?tamanhoPagina=100", {
      token: await gerente(),
    });
    return Object.fromEntries(lista.dados.map((c: Json) => [c.nome, c.id]));
  })();
  return cargos;
}

export interface Funcionario {
  id: number;
  login: string;
  token: string;
}

/** Cria um funcionário com login e (opcionalmente) cargos vigentes hoje. */
export async function criarFuncionario(...nomesDosCargos: string[]): Promise<Funcionario> {
  const token = await gerente();
  const login = unico("func");
  const funcionario = await ok(201, "POST", "/funcionarios", {
    token,
    corpo: { nome: `Funcionário ${login}`, login, senha: SENHA_PADRAO },
  });
  const ids = await idsDosCargos();
  for (const nome of nomesDosCargos) {
    await ok(201, "POST", `/funcionarios/${funcionario.id}/cargos`, {
      token,
      corpo: { cargoId: ids[nome] },
    });
  }
  return { id: funcionario.id, login, token: await entrar(login, SENHA_PADRAO) };
}

export async function criarCategoria(): Promise<number> {
  const categoria = await ok(201, "POST", "/categorias", {
    token: await gerente(),
    corpo: { nome: unico("Cat") },
  });
  return categoria.id;
}

export async function criarProduto(
  categoriaId: number,
  preco: number,
  extras: Record<string, unknown> = {},
): Promise<Json> {
  return ok(201, "POST", "/produtos", {
    token: await gerente(),
    corpo: { nome: unico("Produto"), preco, categoriaId, ...extras },
  });
}

export async function criarCliente(comEndereco = true): Promise<Json> {
  return ok(201, "POST", "/clientes", {
    token: await gerente(),
    corpo: {
      nome: unico("Cliente"),
      telefone: "11999990000",
      ...(comEndereco
        ? {
            enderecoPadraoLogradouro: "Rua das Flores",
            enderecoPadraoNumero: "10",
            enderecoPadraoBairro: "Centro",
            enderecoPadraoCidade: "São Paulo",
            enderecoPadraoCep: "01000-000",
          }
        : {}),
    },
  });
}

export async function idDaFormaDePagamento(nome: string): Promise<number> {
  const lista = await ok(200, "GET", "/formas-pagamento?tamanhoPagina=100", {
    token: await gerente(),
  });
  const forma = lista.dados.find((f: Json) => f.nome === nome);
  assert.ok(forma, `forma de pagamento "${nome}" deveria vir do seed`);
  return forma.id;
}

/** Leva o pedido pelos status informados, um de cada vez. */
export async function avancar(token: string, pedidoId: number, ...status: string[]) {
  let pedido: Json;
  for (const s of status) {
    pedido = await ok(200, "POST", `/pedidos/${pedidoId}/status`, {
      token,
      corpo: { status: s },
    });
  }
  return pedido;
}
