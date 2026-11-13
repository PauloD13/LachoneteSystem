import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  api,
  criarCategoria,
  criarFuncionario,
  criarProduto,
  dia,
  gerente,
  idsDosCargos,
  ok,
  unico,
} from "./apoio.ts";

describe("dados iniciais (seed)", () => {
  it("cargos, formas de pagamento e categorias do enunciado já existem", async () => {
    const token = await gerente();
    const nomes = async (rota: string) =>
      (await ok(200, "GET", `${rota}?tamanhoPagina=100`, { token })).dados.map((x: { nome: string }) => x.nome);

    for (const cargo of ["atendente", "cozinheiro", "entregador", "gerente"]) {
      assert.ok((await nomes("/cargos")).includes(cargo), cargo);
    }
    for (const forma of ["dinheiro", "pix", "cartao_credito"]) {
      assert.ok((await nomes("/formas-pagamento")).includes(forma), forma);
    }
    for (const categoria of ["Lanches", "Bebidas", "Porções", "Sobremesas"]) {
      assert.ok((await nomes("/categorias")).includes(categoria), categoria);
    }
  });
});

describe("paginação", () => {
  it("toda listagem de primeiro nível usa o mesmo envelope", async () => {
    const token = await gerente();
    const rotas = [
      "/clientes", "/funcionarios", "/cargos", "/mesas", "/formas-pagamento",
      "/categorias", "/produtos", "/combos", "/adicionais", "/promocoes",
      "/cupons", "/fornecedores", "/ingredientes", "/pedidos",
    ];
    for (const rota of rotas) {
      const corpo = await ok(200, "GET", `${rota}?tamanhoPagina=2`, { token });
      assert.ok(Array.isArray(corpo.dados), rota);
      assert.ok(corpo.dados.length <= 2, rota);
      const { pagina, tamanhoPagina, total, totalPaginas } = corpo.paginacao;
      assert.equal(pagina, 1, rota);
      assert.equal(tamanhoPagina, 2, rota);
      assert.equal(totalPaginas, Math.ceil(total / 2), rota);
    }
  });

  it("páginas não se repetem nem pulam registros; limites são validados", async () => {
    const token = await gerente();
    const categoriaId = await criarCategoria();
    const criados: number[] = [];
    for (let i = 0; i < 5; i += 1) criados.push((await criarProduto(categoriaId, 10 + i)).id);

    const vistos: number[] = [];
    for (let pagina = 1; pagina <= 3; pagina += 1) {
      const corpo = await ok(200, "GET", `/produtos?categoriaId=${categoriaId}&tamanhoPagina=2&pagina=${pagina}`, { token });
      assert.equal(corpo.paginacao.total, 5);
      vistos.push(...corpo.dados.map((p: { id: number }) => p.id));
    }
    assert.deepEqual(vistos, criados);

    assert.equal((await api("GET", "/produtos?tamanhoPagina=101", { token })).status, 400);
    assert.equal((await api("GET", "/produtos?pagina=0", { token })).status, 400);
  });

  it("clientes: ?busca= encontra por nome ou telefone", async () => {
    const token = await gerente();
    const marca = unico("Zulmira");
    await ok(201, "POST", "/clientes", { token, corpo: { nome: `${marca} Souza`, telefone: "11911112222" } });
    const achados = await ok(200, "GET", `/clientes?busca=${marca.toUpperCase()}`, { token });
    assert.equal(achados.paginacao.total, 1);
  });
});

describe("validação alinhada às colunas do banco", () => {
  it("nomes maiores que a coluna são recusados com 400", async () => {
    const token = await gerente();
    assert.equal((await api("POST", "/categorias", { token, corpo: { nome: "c".repeat(51) } })).status, 400);
    assert.equal((await api("POST", "/cargos", { token, corpo: { nome: "c".repeat(31) } })).status, 400);
    assert.equal((await api("POST", "/clientes", { token, corpo: { nome: "c".repeat(151), telefone: "11999990000" } })).status, 400);
    // No limite, passa.
    await ok(201, "POST", "/categorias", { token, corpo: { nome: unico("C").padEnd(50, "x") } });
    await ok(201, "POST", "/clientes", { token, corpo: { nome: "c".repeat(150), telefone: "11999990000" } });
  });

  it("preço de produto: sem estouro e sem arredondamento silencioso", async () => {
    const token = await gerente();
    const categoriaId = await criarCategoria();
    const base = { nome: unico("Produto"), categoriaId };
    for (const preco of [100_000_000, 10.999, 0, -5, "12.50"]) {
      const r = await api("POST", "/produtos", { token, corpo: { ...base, preco } });
      assert.equal(r.status, 400, `preco=${preco} -> ${r.status}`);
    }
    const p = await ok(201, "POST", "/produtos", { token, corpo: { ...base, preco: 99_999_999.99 } });
    assert.equal(Number(p.preco), 99_999_999.99);
  });

  it("categoria inexistente é 400, não erro de chave estrangeira", async () => {
    const r = await api("POST", "/produtos", {
      token: await gerente(),
      corpo: { nome: unico("Produto"), preco: 10, categoriaId: 2_000_000_000 },
    });
    assert.equal(r.status, 400);
    assert.match(r.corpo.error, /Categoria/);
  });

  it("desconto percentual acima de 100 e vigência invertida são recusados", async () => {
    const token = await gerente();
    const cupom = (extra: object) => ({
      codigo: unico("CUP").toUpperCase(),
      tipoDesconto: "PERCENTUAL",
      valorDesconto: 10,
      dataInicio: dia(0),
      dataFim: dia(5),
      ...extra,
    });
    assert.equal((await api("POST", "/cupons", { token, corpo: cupom({ valorDesconto: 101 }) })).status, 400);
    assert.equal((await api("POST", "/cupons", { token, corpo: cupom({ dataFim: dia(-1) }) })).status, 400);
    await ok(201, "POST", "/cupons", { token, corpo: cupom({ valorDesconto: 100 }) });
  });
});

describe("produto x combo (especialização)", () => {
  it("o id de um combo não é aceito nas rotas de produto, e vice-versa", async () => {
    const token = await gerente();
    const categoriaId = await criarCategoria();
    const a = await criarProduto(categoriaId, 20);
    const b = await criarProduto(categoriaId, 8);
    const combo = await ok(201, "POST", "/combos", {
      token,
      corpo: { nome: unico("Combo"), preco: 25, itens: [{ produtoId: a.id }, { produtoId: b.id }] },
    });

    assert.equal((await api("GET", `/produtos/${combo.id}`, { token })).status, 404);
    assert.equal((await api("PATCH", `/produtos/${combo.id}`, { token, corpo: { nome: "Invasor" } })).status, 404);
    assert.equal((await api("DELETE", `/produtos/${combo.id}`, { token })).status, 404);
    assert.equal((await api("GET", `/combos/${a.id}`, { token })).status, 404);
    assert.equal((await api("DELETE", `/combos/${a.id}`, { token })).status, 404);

    // Nada foi alterado pelas tentativas acima.
    assert.equal((await ok(200, "GET", `/combos/${combo.id}`, { token })).nome, combo.nome);
    // Produto que compõe um combo não pode ser apagado.
    assert.equal((await api("DELETE", `/produtos/${a.id}`, { token })).status, 409);
  });

  it("combo exige pelo menos duas unidades e produtos existentes", async () => {
    const token = await gerente();
    const categoriaId = await criarCategoria();
    const a = await criarProduto(categoriaId, 20);
    const combo = (itens: unknown) => ({ nome: unico("Combo"), preco: 25, itens });
    assert.equal((await api("POST", "/combos", { token, corpo: combo([{ produtoId: a.id }]) })).status, 400);
    assert.equal((await api("POST", "/combos", { token, corpo: combo([{ produtoId: a.id }, { produtoId: 2_000_000_000 }]) })).status, 400);
    await ok(201, "POST", "/combos", { token, corpo: combo([{ produtoId: a.id, quantidade: 2 }]) });
  });
});

describe("desativar em vez de apagar", () => {
  it("?ativo= filtra produtos, adicionais e funcionários", async () => {
    const token = await gerente();
    const categoriaId = await criarCategoria();
    const ligado = await criarProduto(categoriaId, 10);
    const desligado = await criarProduto(categoriaId, 10, { ativo: false });
    assert.equal(ligado.ativo, true);
    assert.equal(desligado.ativo, false);

    const ids = async (ativo: boolean) =>
      (await ok(200, "GET", `/produtos?categoriaId=${categoriaId}&ativo=${ativo}`, { token })).dados.map((p: { id: number }) => p.id);
    assert.deepEqual(await ids(true), [ligado.id]);
    assert.deepEqual(await ids(false), [desligado.id]);

    const religado = await ok(200, "PATCH", `/produtos/${desligado.id}`, { token, corpo: { ativo: true } });
    assert.equal(religado.ativo, true);

    assert.equal((await api("GET", "/produtos?ativo=talvez", { token })).status, 400);
    await ok(200, "GET", "/adicionais?ativo=true", { token });
    await ok(200, "GET", "/funcionarios?ativo=true&cargo=entregador", { token });
  });

  it("funcionário com histórico de cargo não pode ser apagado, só desativado", async () => {
    const token = await gerente();
    const f = await criarFuncionario("cozinheiro");
    const r = await api("DELETE", `/funcionarios/${f.id}`, { token });
    assert.equal(r.status, 409);
    assert.match(r.corpo.error, /desative/);
    // O histórico continua lá.
    assert.equal((await ok(200, "GET", `/funcionarios/${f.id}/cargos`, { token })).length, 1);

    const semHistorico = await ok(201, "POST", "/funcionarios", { token, corpo: { nome: "Temporário" } });
    await ok(204, "DELETE", `/funcionarios/${semHistorico.id}`, { token });
  });
});

describe("cargos", () => {
  it("os cargos-base não podem ser renomeados nem removidos", async () => {
    const token = await gerente();
    const { gerente: id } = await idsDosCargos();
    assert.equal((await api("PATCH", `/cargos/${id}`, { token, corpo: { nome: "chefe" } })).status, 409);
    assert.equal((await api("DELETE", `/cargos/${id}`, { token })).status, 409);
  });

  it("nome de cargo é normalizado em minúsculas (sem duplicar por caixa)", async () => {
    const token = await gerente();
    const nome = unico("Caixa");
    const criado = await ok(201, "POST", "/cargos", { token, corpo: { nome } });
    assert.equal(criado.nome, nome.toLowerCase());
    assert.equal((await api("POST", "/cargos", { token, corpo: { nome: nome.toUpperCase() } })).status, 409);
    await ok(204, "DELETE", `/cargos/${criado.id}`, { token });
  });
});

describe("vínculo funcionário x cargo", () => {
  it("funcionário inexistente é 404 em todas as operações", async () => {
    const token = await gerente();
    const { atendente } = await idsDosCargos();
    const rota = "/funcionarios/2000000000/cargos";
    assert.equal((await api("GET", rota, { token })).status, 404);
    assert.equal((await api("POST", rota, { token, corpo: { cargoId: atendente } })).status, 404);
    assert.equal((await api("PATCH", `${rota}/1`, { token })).status, 404);
  });

  it("sem data informada, o vínculo começa e termina HOJE no fuso do negócio", async () => {
    const token = await gerente();
    const f = await criarFuncionario();
    const { cozinheiro } = await idsDosCargos();
    const aberto = await ok(201, "POST", `/funcionarios/${f.id}/cargos`, { token, corpo: { cargoId: cozinheiro } });
    assert.equal(aberto.dataInicio.slice(0, 10), dia(0));
    assert.equal(aberto.dataFim, null);

    const fechado = await ok(200, "PATCH", `/funcionarios/${f.id}/cargos/${aberto.id}`, { token });
    assert.equal(fechado.dataFim.slice(0, 10), dia(0));
  });

  it("vínculo encerrado não é encerrado de novo (a data original é preservada)", async () => {
    const token = await gerente();
    const f = await criarFuncionario();
    const { cozinheiro } = await idsDosCargos();
    const rota = `/funcionarios/${f.id}/cargos`;
    const v = await ok(201, "POST", rota, { token, corpo: { cargoId: cozinheiro, dataInicio: dia(-30) } });

    await ok(200, "PATCH", `${rota}/${v.id}`, { token, corpo: { dataFim: dia(-10) } });
    const denovo = await api("PATCH", `${rota}/${v.id}`, { token, corpo: { dataFim: dia(0) } });
    assert.equal(denovo.status, 409);

    const [gravado] = await ok(200, "GET", rota, { token });
    assert.equal(gravado.dataFim.slice(0, 10), dia(-10));
  });

  it("regras do vínculo: cargo repetido em aberto, fim antes do início, vínculo de outro funcionário", async () => {
    const token = await gerente();
    const f = await criarFuncionario();
    const outro = await criarFuncionario();
    const { cozinheiro, entregador } = await idsDosCargos();
    const rota = `/funcionarios/${f.id}/cargos`;

    const v = await ok(201, "POST", rota, { token, corpo: { cargoId: cozinheiro, dataInicio: dia(-5) } });
    const repetido = await api("POST", rota, { token, corpo: { cargoId: cozinheiro } });
    assert.equal(repetido.status, 409);
    assert.match(repetido.corpo.error, /já exerce este cargo/);
    // Acumular cargos DIFERENTES é permitido (regra 4.5).
    await ok(201, "POST", rota, { token, corpo: { cargoId: entregador } });

    assert.equal((await api("PATCH", `${rota}/${v.id}`, { token, corpo: { dataFim: dia(-6) } })).status, 400);
    assert.equal((await api("PATCH", `/funcionarios/${outro.id}/cargos/${v.id}`, { token })).status, 404);
    assert.equal((await api("POST", rota, { token, corpo: { cargoId: 2_000_000_000 } })).status, 400);
    assert.equal((await api("POST", rota, { token, corpo: { cargoId: cozinheiro, dataInicio: "31/12/2026" } })).status, 400);

    // Depois de encerrado, o mesmo cargo pode ser reaberto (novo período).
    await ok(200, "PATCH", `${rota}/${v.id}`, { token, corpo: { dataFim: dia(-1) } });
    await ok(201, "POST", rota, { token, corpo: { cargoId: cozinheiro } });
    assert.equal((await ok(200, "GET", rota, { token })).length, 3);
  });
});

describe("promoções", () => {
  const promocao = (produtoId: number, extra: object = {}) => ({
    nome: unico("Promo"),
    dataInicio: dia(0),
    dataFim: dia(7),
    tipoDesconto: "PERCENTUAL",
    valorDesconto: 10,
    produtoIds: [produtoId],
    ...extra,
  });

  it("promoção que começa hoje ainda pode ser corrigida e apagada", async () => {
    const token = await gerente();
    const produto = await criarProduto(await criarCategoria(), 20);
    const p = await ok(201, "POST", "/promocoes", { token, corpo: promocao(produto.id) });
    const editada = await ok(200, "PATCH", `/promocoes/${p.id}`, { token, corpo: { valorDesconto: 15 } });
    assert.equal(Number(editada.valorDesconto), 15);
    await ok(204, "DELETE", `/promocoes/${p.id}`, { token });
  });

  it("promoção que já vigorou é histórico: só nome e dataFim mudam", async () => {
    const token = await gerente();
    const categoriaId = await criarCategoria();
    const produto = await criarProduto(categoriaId, 20);
    const outro = await criarProduto(categoriaId, 20);
    const p = await ok(201, "POST", "/promocoes", {
      token,
      corpo: promocao(produto.id, { dataInicio: dia(-10), dataFim: dia(10) }),
    });
    const rota = `/promocoes/${p.id}`;

    assert.equal((await api("DELETE", rota, { token })).status, 409);
    for (const mudanca of [
      { valorDesconto: 50 },
      { tipoDesconto: "VALOR" },
      { dataInicio: dia(-20) },
      { produtoIds: [outro.id] },
      { produtoIds: [produto.id, outro.id] },
      { dataFim: dia(-5) },
    ]) {
      const r = await api("PATCH", rota, { token, corpo: mudanca });
      assert.equal(r.status, 409, JSON.stringify(mudanca));
    }

    // Reenviar o formulário inteiro sem mudar a regra não é erro.
    const renomeada = await ok(200, "PATCH", rota, {
      token,
      corpo: { nome: "Novo nome", valorDesconto: 10, tipoDesconto: "PERCENTUAL", dataInicio: dia(-10), produtoIds: [produto.id] },
    });
    assert.equal(renomeada.nome, "Novo nome");
    // Encerrar (ontem) ou prorrogar continuam possíveis.
    await ok(200, "PATCH", rota, { token, corpo: { dataFim: dia(-1) } });
    await ok(200, "PATCH", rota, { token, corpo: { dataFim: dia(30) } });
  });

  it("?ativaEm= devolve só as promoções em vigor no dia", async () => {
    const token = await gerente();
    const produto = await criarProduto(await criarCategoria(), 20);
    const p = await ok(201, "POST", "/promocoes", {
      token,
      corpo: promocao(produto.id, { dataInicio: dia(40), dataFim: dia(41) }),
    });
    const noDia = await ok(200, "GET", `/promocoes?ativaEm=${dia(40)}&tamanhoPagina=100`, { token });
    assert.ok(noDia.dados.some((x: { id: number }) => x.id === p.id));
    const depois = await ok(200, "GET", `/promocoes?ativaEm=${dia(42)}&tamanhoPagina=100`, { token });
    assert.ok(!depois.dados.some((x: { id: number }) => x.id === p.id));
  });
});
