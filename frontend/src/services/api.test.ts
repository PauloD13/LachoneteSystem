import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  definirAoExpirarSessao,
  definirToken,
  ErroDaApi,
  mensagemDeErro,
  montarConsulta,
  requisitar,
} from "./api";

function responder(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchFalso = vi.fn<typeof fetch>();

/** Executa a chamada esperando que ela FALHE; devolve o erro lançado. */
async function falhaDe(chamada: Promise<unknown>): Promise<ErroDaApi> {
  try {
    await chamada;
  } catch (erro) {
    if (erro instanceof ErroDaApi) return erro;
    throw erro;
  }
  throw new Error("a chamada deveria ter falhado");
}

beforeEach(() => {
  fetchFalso.mockReset();
  vi.stubGlobal("fetch", fetchFalso);
  definirToken(null);
  definirAoExpirarSessao(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("montarConsulta", () => {
  it("omite valores vazios e monta a query string", () => {
    expect(
      montarConsulta({ pagina: 2, busca: "ana maria", ativo: false, x: "" }),
    ).toBe("?pagina=2&busca=ana+maria&ativo=false");
    expect(montarConsulta({ a: undefined, b: null })).toBe("");
  });
});

describe("requisitar", () => {
  it("prefixa /api, envia JSON e o token", async () => {
    fetchFalso.mockResolvedValue(responder(201, { id: 7 }));
    definirToken("abc");

    const criado = await requisitar<{ id: number }>("POST", "/clientes", {
      corpo: { nome: "Ana" },
      consulta: { pagina: 1 },
    });

    expect(criado).toEqual({ id: 7 });
    const [url, init] = fetchFalso.mock.calls[0]!;
    expect(url).toBe("/api/clientes?pagina=1");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('{"nome":"Ana"}');
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer abc",
      "Content-Type": "application/json",
    });
  });

  it("204 sem conteúdo devolve undefined", async () => {
    fetchFalso.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(requisitar("DELETE", "/clientes/1")).resolves.toBeUndefined();
  });

  it("erro de validação vira ErroDaApi com as mensagens por campo", async () => {
    fetchFalso.mockResolvedValue(
      responder(400, {
        error: "Erro de validação nos dados enviados.",
        details: { nome: ["O nome deve ter pelo menos 2 caracteres."] },
      }),
    );

    const erro = await falhaDe(requisitar("POST", "/categorias"));

    expect(erro).toBeInstanceOf(ErroDaApi);
    expect(erro.status).toBe(400);
    expect(erro.doCampo("nome")).toBe(
      "O nome deve ter pelo menos 2 caracteres.",
    );
    expect(mensagemDeErro(erro)).toBe("Erro de validação nos dados enviados.");
  });

  it("401 com token avisa que a sessão expirou", async () => {
    const aoExpirar = vi.fn();
    definirAoExpirarSessao(aoExpirar);
    definirToken("vencido");
    fetchFalso.mockResolvedValue(responder(401, { error: "Sessão inválida" }));

    await expect(requisitar("GET", "/produtos")).rejects.toThrow(
      "Sessão inválida",
    );
    expect(aoExpirar).toHaveBeenCalledOnce();
  });

  it("401 sem token (senha errada no login) não desloga ninguém", async () => {
    const aoExpirar = vi.fn();
    definirAoExpirarSessao(aoExpirar);
    fetchFalso.mockResolvedValue(
      responder(401, { error: "Login ou senha inválidos." }),
    );

    await expect(requisitar("POST", "/auth/login")).rejects.toThrow(
      "Login ou senha inválidos.",
    );
    expect(aoExpirar).not.toHaveBeenCalled();
  });

  it("servidor fora do ar vira mensagem amigável (status 0)", async () => {
    fetchFalso.mockRejectedValue(new TypeError("Failed to fetch"));
    const erro = await falhaDe(requisitar("GET", "/produtos"));
    expect(erro.status).toBe(0);
    expect(erro.message).toMatch(/conectar ao servidor/);
  });

  it("erro sem corpo JSON usa mensagem padrão pelo status", async () => {
    fetchFalso.mockResolvedValue(new Response("Bad Gateway", { status: 502 }));
    await expect(requisitar("GET", "/produtos")).rejects.toThrow(
      /servidor está com problemas/,
    );
  });
});
