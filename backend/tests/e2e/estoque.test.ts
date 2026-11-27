import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import {
  api,
  avancar,
  criarCategoria,
  criarFuncionario,
  criarProduto,
  gerente,
  ok,
  unico,
  type Funcionario,
  type Json,
} from "./apoio.ts";

let admin: string;
let atendente: Funcionario;
let fornecedorId: number;
let categoriaId: number;

before(async () => {
  admin = await gerente();
  atendente = await criarFuncionario("atendente");
  categoriaId = await criarCategoria();
  fornecedorId = (
    await ok(201, "POST", "/fornecedores", {
      token: admin,
      corpo: { nome: unico("Fornecedor") },
    })
  ).id;
});

async function criarIngrediente(quantidadeEstoque: number, estoqueMinimo = 0) {
  return ok(201, "POST", "/ingredientes", {
    token: admin,
    corpo: {
      nome: unico("Ingrediente"),
      unidadeMedida: "unidade",
      quantidadeEstoque,
      estoqueMinimo,
      fornecedorId,
    },
  });
}

async function naFicha(produtoId: number, ingredienteId: number, qtd: number) {
  await ok(200, "PUT", `/produtos/${produtoId}/ingredientes/${ingredienteId}`, {
    token: admin,
    corpo: { quantidadeUtilizada: qtd },
  });
}

const estoqueDe = async (id: number) =>
  (await ok(200, "GET", `/ingredientes/${id}`, { token: admin }))
    .quantidadeEstoque;

describe("estoque mínimo", () => {
  it("marca para repor quem está no mínimo ou abaixo, e filtra por isso", async () => {
    const acabando = await criarIngrediente(2, 5);
    const noLimite = await criarIngrediente(5, 5);
    const folgado = await criarIngrediente(10, 5);
    const semAlerta = await criarIngrediente(0, 0);

    assert.equal(acabando.repor, true);
    assert.equal(acabando.estoqueMinimo, "5");
    assert.equal(noLimite.repor, true);
    assert.equal(folgado.repor, false);
    assert.equal(semAlerta.repor, false, "mínimo 0 desliga o alerta");

    const lista = await ok(
      200,
      "GET",
      `/ingredientes?fornecedorId=${fornecedorId}&repor=true&tamanhoPagina=100`,
      { token: admin },
    );
    const ids = lista.dados.map((i: Json) => i.id);
    assert.ok(ids.includes(acabando.id) && ids.includes(noLimite.id));
    assert.ok(!ids.includes(folgado.id) && !ids.includes(semAlerta.id));
    assert.ok(lista.dados.every((i: Json) => i.repor === true));

    // Repor o estoque tira o alerta.
    const reposto = await ok(200, "PATCH", `/ingredientes/${acabando.id}`, {
      token: admin,
      corpo: { quantidadeEstoque: 20 },
    });
    assert.equal(reposto.repor, false);
  });

  it("recusa estoque mínimo negativo", async () => {
    const r = await api("POST", "/ingredientes", {
      token: admin,
      corpo: {
        nome: unico("Ingrediente"),
        unidadeMedida: "kg",
        estoqueMinimo: -1,
        fornecedorId,
      },
    });
    assert.equal(r.status, 400);
    assert.ok(r.corpo.details.estoqueMinimo);
  });
});

describe("baixa automática do estoque", () => {
  it("baixa pela ficha técnica quando o pedido entra em preparo, incluindo combos", async () => {
    const pao = await criarIngrediente(50);
    const lanche = await criarProduto(categoriaId, 20);
    const bebida = await criarProduto(categoriaId, 5);
    await naFicha(lanche.id, pao.id, 1.5);
    const combo = await ok(201, "POST", "/combos", {
      token: admin,
      corpo: {
        nome: unico("Combo"),
        preco: 22,
        itens: [
          { produtoId: lanche.id, quantidade: 2 },
          { produtoId: bebida.id },
        ],
      },
    });

    const pedido = await ok(201, "POST", "/pedidos", {
      token: atendente.token,
      corpo: {
        canal: "BALCAO",
        itens: [
          { itemVendavelId: lanche.id, quantidade: 2 },
          { itemVendavelId: combo.id, quantidade: 1 },
        ],
      },
    });
    assert.equal(await estoqueDe(pao.id), "50", "registrar não baixa");

    await avancar(atendente.token, pedido.id, "EM_PREPARO");
    // 2 lanches x 1,5 + 1 combo x 2 lanches x 1,5 = 6
    assert.equal(await estoqueDe(pao.id), "44");

    // Os passos seguintes não baixam de novo; cancelar depois não devolve.
    await avancar(atendente.token, pedido.id, "PRONTO", "CANCELADO");
    assert.equal(await estoqueDe(pao.id), "44");
  });

  it("pedido cancelado antes do preparo não mexe no estoque", async () => {
    const queijo = await criarIngrediente(10);
    const lanche = await criarProduto(categoriaId, 20);
    await naFicha(lanche.id, queijo.id, 1);
    const pedido = await ok(201, "POST", "/pedidos", {
      token: atendente.token,
      corpo: {
        canal: "BALCAO",
        itens: [{ itemVendavelId: lanche.id, quantidade: 3 }],
      },
    });
    await avancar(atendente.token, pedido.id, "CANCELADO");
    assert.equal(await estoqueDe(queijo.id), "10");
  });

  it("o estoque para em zero e o ingrediente passa a pedir reposição", async () => {
    const carne = await criarIngrediente(1, 2);
    const lanche = await criarProduto(categoriaId, 20);
    await naFicha(lanche.id, carne.id, 0.4);
    const pedido = await ok(201, "POST", "/pedidos", {
      token: atendente.token,
      corpo: {
        canal: "BALCAO",
        itens: [{ itemVendavelId: lanche.id, quantidade: 5 }],
      },
    });
    // 5 x 0,4 = 2, mas só havia 1: o preparo não é barrado.
    await avancar(atendente.token, pedido.id, "EM_PREPARO");
    const depois = await ok(200, "GET", `/ingredientes/${carne.id}`, {
      token: admin,
    });
    assert.equal(depois.quantidadeEstoque, "0");
    assert.equal(depois.repor, true);
  });
});
