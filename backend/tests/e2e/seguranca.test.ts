import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  api,
  criarFuncionario,
  dia,
  entrar,
  gerente,
  idsDosCargos,
  ok,
  SENHA_PADRAO,
  unico,
} from "./apoio.ts";

describe("disponibilidade e cabeçalhos", () => {
  it("/health é público e informa o estado do banco", async () => {
    const r = await api("GET", "/health");
    assert.equal(r.status, 200);
    assert.equal(r.corpo.banco, "ok");
  });

  it("não anuncia a tecnologia e identifica cada requisição", async () => {
    const r = await api("GET", "/health");
    assert.equal(r.cabecalhos.get("x-powered-by"), null);
    assert.equal(r.cabecalhos.get("x-content-type-options"), "nosniff");
    assert.match(r.cabecalhos.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/);
  });
});

describe("autenticação", () => {
  it("sem token, toda rota de negócio responde 401", async () => {
    for (const rota of ["/produtos", "/pedidos", "/clientes", "/relatorios/mais-vendidos", "/rota-que-nao-existe"]) {
      assert.equal((await api("GET", rota)).status, 401, rota);
    }
    assert.equal((await api("POST", "/pedidos", { corpo: {} })).status, 401);
  });

  it("recusa token adulterado, token inventado e esquema errado", async () => {
    const valido = await gerente();
    const adulterado = valido.slice(0, -3) + (valido.endsWith("aaa") ? "bbb" : "aaa");
    assert.equal((await api("GET", "/auth/me", { token: adulterado })).status, 401);
    assert.equal((await api("GET", "/auth/me", { token: "abc.def.ghi" })).status, 401);

    // Token "sem assinatura" (alg: none), truque clássico de falsificação.
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const semAssinatura = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "1" })}.`;
    assert.equal((await api("GET", "/auth/me", { token: semAssinatura })).status, 401);
  });

  it("login errado e login inexistente dão a MESMA resposta", async () => {
    const f = await criarFuncionario();
    const senhaErrada = await api("POST", "/auth/login", {
      corpo: { login: f.login, senha: "senha-errada-999" },
    });
    const inexistente = await api("POST", "/auth/login", {
      corpo: { login: unico("ninguem"), senha: "senha-errada-999" },
    });
    assert.equal(senhaErrada.status, 401);
    assert.equal(inexistente.status, 401);
    assert.deepEqual(senhaErrada.corpo, inexistente.corpo);
  });

  it("/auth/me devolve o usuário e os cargos de hoje", async () => {
    const f = await criarFuncionario("atendente", "entregador");
    const eu = await ok(200, "GET", "/auth/me", { token: f.token });
    assert.equal(eu.id, f.id);
    assert.deepEqual([...eu.cargos].sort(), ["atendente", "entregador"]);
  });

  it("o hash da senha nunca aparece em nenhuma resposta", async () => {
    const token = await gerente();
    const f = await criarFuncionario("atendente");
    const respostas = [
      await ok(200, "GET", `/funcionarios/${f.id}`, { token }),
      await ok(200, "GET", "/funcionarios?tamanhoPagina=100", { token }),
      await ok(200, "PATCH", `/funcionarios/${f.id}`, { token, corpo: { telefone: "1133334444" } }),
      await ok(200, "POST", "/auth/login", { corpo: { login: f.login, senha: SENHA_PADRAO } }),
    ];
    for (const corpo of respostas) {
      const texto = JSON.stringify(corpo);
      assert.ok(!/senha/i.test(texto), "resposta contém campo de senha");
      assert.ok(!texto.includes("scrypt$"), "resposta contém hash");
    }
  });

  it("trocar a própria senha derruba os tokens antigos", async () => {
    const f = await criarFuncionario();
    const nova = "outra-senha-456";

    assert.equal(
      (await api("PATCH", "/auth/senha", { token: f.token, corpo: { senhaAtual: "errada-000", novaSenha: nova } })).status,
      401,
    );
    await ok(204, "PATCH", "/auth/senha", {
      token: f.token,
      corpo: { senhaAtual: SENHA_PADRAO, novaSenha: nova },
    });

    assert.equal((await api("GET", "/auth/me", { token: f.token })).status, 401);
    assert.equal((await api("POST", "/auth/login", { corpo: { login: f.login, senha: SENHA_PADRAO } })).status, 401);
    await ok(200, "GET", "/auth/me", { token: await entrar(f.login, nova) });
  });

  it("funcionário desativado perde o acesso na hora", async () => {
    const f = await criarFuncionario("atendente");
    await ok(200, "PATCH", `/funcionarios/${f.id}`, {
      token: await gerente(),
      corpo: { ativo: false },
    });
    assert.equal((await api("GET", "/auth/me", { token: f.token })).status, 401);
    assert.equal((await api("POST", "/auth/login", { corpo: { login: f.login, senha: SENHA_PADRAO } })).status, 401);
  });

  it("remover o login (login: null) também encerra o acesso", async () => {
    const f = await criarFuncionario();
    const depois = await ok(200, "PATCH", `/funcionarios/${f.id}`, {
      token: await gerente(),
      corpo: { login: null },
    });
    assert.equal(depois.login, null);
    assert.equal((await api("GET", "/auth/me", { token: f.token })).status, 401);
  });

  it("bloqueia tentativas repetidas de adivinhar a senha (por login)", async () => {
    const alvo = await criarFuncionario();
    let bloqueou = false;
    for (let i = 0; i < 15 && !bloqueou; i += 1) {
      const r = await api("POST", "/auth/login", {
        corpo: { login: alvo.login, senha: `palpite-${i}` },
      });
      bloqueou = r.status === 429;
    }
    assert.ok(bloqueou, "esperava 429 (confira LIMITE_TENTATIVAS_LOGIN na API)");

    // O bloqueio é por login: os colegas continuam entrando normalmente.
    const outro = await criarFuncionario();
    await entrar(outro.login, SENHA_PADRAO);
  });
});

describe("autorização por cargo", () => {
  it("quem não é gerente consulta, mas não altera cadastros nem vê relatórios", async () => {
    const atendente = await criarFuncionario("atendente");
    const t = atendente.token;

    await ok(200, "GET", "/produtos", { token: t });
    await ok(200, "GET", "/funcionarios", { token: t });

    const proibidas: [string, string, unknown?][] = [
      ["POST", "/categorias", { nome: unico("Cat") }],
      ["POST", "/produtos", { nome: "X", preco: 1, categoriaId: 1 }],
      ["POST", "/funcionarios", { nome: "Fulano" }],
      ["PATCH", `/funcionarios/${atendente.id}`, { nome: "Outro Nome" }],
      ["POST", `/funcionarios/${atendente.id}/cargos`, { cargoId: 1 }],
      ["POST", "/cupons", {}],
      ["DELETE", "/clientes/1"],
      ["GET", "/relatorios/mais-vendidos?dataInicio=2026-01-01&dataFim=2026-01-31"],
    ];
    for (const [metodo, rota, corpo] of proibidas) {
      const r = await api(metodo, rota, { token: t, corpo });
      assert.equal(r.status, 403, `${metodo} ${rota} -> ${r.status}`);
    }
  });

  it("um atendente não consegue se promover a gerente", async () => {
    const atendente = await criarFuncionario("atendente");
    const r = await api("PATCH", `/funcionarios/${atendente.id}`, {
      token: atendente.token,
      corpo: { cargos: ["gerente"], ativo: true },
    });
    assert.equal(r.status, 403);
  });

  it("o gerente não remove o próprio acesso (o sistema nunca fica sem gerente)", async () => {
    const chefe = await criarFuncionario("gerente");
    const t = chefe.token;

    assert.equal((await api("PATCH", `/funcionarios/${chefe.id}`, { token: t, corpo: { ativo: false } })).status, 409);
    assert.equal((await api("PATCH", `/funcionarios/${chefe.id}`, { token: t, corpo: { login: null } })).status, 409);
    assert.equal((await api("DELETE", `/funcionarios/${chefe.id}`, { token: t })).status, 409);

    const vinculos = await ok(200, "GET", `/funcionarios/${chefe.id}/cargos`, { token: t });
    const r = await api("PATCH", `/funcionarios/${chefe.id}/cargos/${vinculos[0].id}`, { token: t });
    assert.equal(r.status, 409);
  });

  it("encerrar o cargo de gerente tira os poderes imediatamente", async () => {
    const admin = await gerente();
    const chefe = await criarFuncionario();
    const { gerente: cargoId } = await idsDosCargos();
    const vinculo = await ok(201, "POST", `/funcionarios/${chefe.id}/cargos`, {
      token: admin,
      corpo: { cargoId, dataInicio: dia(-10) },
    });

    // Mesmo token do começo ao fim: os cargos são relidos a cada requisição.
    await ok(201, "POST", "/categorias", { token: chefe.token, corpo: { nome: unico("Cat") } });

    await ok(200, "PATCH", `/funcionarios/${chefe.id}/cargos/${vinculo.id}`, {
      token: admin,
      corpo: { dataFim: dia(-1) },
    });
    const r = await api("POST", "/categorias", { token: chefe.token, corpo: { nome: unico("Cat") } });
    assert.equal(r.status, 403);
  });
});

describe("entradas malformadas não derrubam nem vazam nada", () => {
  it("JSON inválido, corpo que não é objeto e corpo gigante", async () => {
    const token = await gerente();

    const invalido = await api("POST", "/categorias", { token, corpoBruto: "{nome:" });
    assert.equal(invalido.status, 400);

    const lista = await api("POST", "/categorias", { token, corpoBruto: "[1,2,3]" });
    assert.equal(lista.status, 400);
    assert.ok(lista.corpo.details._geral?.length > 0, "deveria explicar o erro do corpo");

    const gigante = await api("POST", "/categorias", {
      token,
      corpo: { nome: "x".repeat(200_000) },
    });
    assert.equal(gigante.status, 413);
  });

  it("ids fora da faixa do INTEGER viram 400, nunca 500", async () => {
    const token = await gerente();
    const rotas = [
      "/clientes/99999999999",
      "/produtos/99999999999",
      "/categorias/99999999999",
      "/cargos/99999999999",
      "/funcionarios/99999999999",
      "/funcionarios/99999999999/cargos",
      "/pedidos/99999999999",
      "/clientes/abc",
      "/produtos/-1",
      "/produtos/1.5",
    ];
    for (const rota of rotas) {
      assert.equal((await api("GET", rota, { token })).status, 400, rota);
    }
  });

  it("tentativa de injeção de SQL é tratada como texto comum", async () => {
    const token = await gerente();
    const r = await api("GET", `/clientes?busca=${encodeURIComponent("'; DROP TABLE cliente; --")}`, { token });
    assert.equal(r.status, 200);
    assert.equal(r.corpo.dados.length, 0);
    await ok(200, "GET", "/clientes", { token });

    assert.equal((await api("GET", "/pedidos?status=RECEBIDO'%20OR%201=1--", { token })).status, 400);
  });

  it("conflitos e erros não expõem nomes de colunas nem códigos internos", async () => {
    const token = await gerente();
    const nome = unico("Cat");
    await ok(201, "POST", "/categorias", { token, corpo: { nome } });
    const repetida = await api("POST", "/categorias", { token, corpo: { nome } });
    assert.equal(repetida.status, 409);
    assert.equal(repetida.corpo.error, "Já existe uma categoria com este nome.");
    assert.equal(repetida.corpo.code, undefined);
    assert.ok(!/P20\d\d|_id|\bnome\)/.test(JSON.stringify(repetida.corpo)));
  });
});
