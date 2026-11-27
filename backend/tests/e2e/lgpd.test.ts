import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import {
  api,
  avancar,
  criarCategoria,
  criarCliente,
  criarFuncionario,
  criarProduto,
  gerente,
  ok,
  type Funcionario,
  type Json,
} from "./apoio.ts";

let admin: string;
let atendente: Funcionario;
let entregador: Funcionario;
let produto: Json;

before(async () => {
  admin = await gerente();
  [atendente, entregador] = await Promise.all([
    criarFuncionario("atendente"),
    criarFuncionario("entregador"),
  ]);
  produto = await criarProduto(await criarCategoria(), 15);
});

/** Pedido de entrega entregue, com observação e avaliação comentada. */
async function pedidoEntregue(clienteId: number) {
  const pedido = await ok(201, "POST", "/pedidos", {
    token: atendente.token,
    corpo: {
      canal: "TELEFONE",
      clienteId,
      observacoes: "Interfone 12, falar com a Maria",
      itens: [{ itemVendavelId: produto.id, quantidade: 1 }],
      entrega: { taxaEntrega: 5 },
    },
  });
  await avancar(atendente.token, pedido.id, "EM_PREPARO", "PRONTO");
  await ok(200, "PATCH", `/pedidos/${pedido.id}/entrega`, {
    token: atendente.token,
    corpo: { entregadorId: entregador.id },
  });
  await avancar(
    atendente.token,
    pedido.id,
    "SAIU_PARA_ENTREGA",
    "ENTREGUE_RETIRADO",
  );
  await ok(201, "POST", `/pedidos/${pedido.id}/avaliacao`, {
    token: atendente.token,
    corpo: { nota: 5, comentario: "Sou a Maria do 12, adorei!" },
  });
  return pedido;
}

describe("LGPD: direitos do titular", () => {
  it("o gerente exporta todos os dados do cliente num arquivo", async () => {
    const cliente = await criarCliente();
    const pedido = await pedidoEntregue(cliente.id);

    const r = await api("GET", `/clientes/${cliente.id}/dados`, {
      token: admin,
    });
    assert.equal(r.status, 200);
    assert.match(
      r.cabecalhos.get("content-disposition") ?? "",
      /attachment; filename="cliente-\d+-dados.json"/,
    );
    assert.equal(r.corpo.cliente.nome, cliente.nome);
    assert.equal(r.corpo.cliente.enderecoPadraoLogradouro, "Rua das Flores");
    assert.deepEqual(
      r.corpo.pedidos.map((p: Json) => p.id),
      [pedido.id],
    );

    assert.equal(
      (
        await api("GET", `/clientes/${cliente.id}/dados`, {
          token: atendente.token,
        })
      ).status,
      403,
      "só o gerente atende pedidos do titular",
    );
  });

  it("anonimiza quem tem pedidos: some o que identifica, ficam itens e valores", async () => {
    const cliente = await criarCliente();
    const pedido = await pedidoEntregue(cliente.id);

    const anonimo = await ok(
      200,
      "POST",
      `/clientes/${cliente.id}/anonimizacao`,
      { token: admin },
    );
    assert.equal(anonimo.nome, "Cliente anonimizado");
    assert.equal(anonimo.telefone, "");
    assert.equal(anonimo.email, null);
    assert.equal(anonimo.enderecoPadraoLogradouro, null);
    assert.ok(anonimo.anonimizadoEm);

    const depois = await ok(200, "GET", `/pedidos/${pedido.id}`, {
      token: admin,
    });
    assert.equal(depois.observacoes, null);
    assert.equal(depois.entrega.endereco.logradouro, "anonimizado");
    assert.equal(depois.entrega.endereco.cep, "-");
    assert.equal(depois.entrega.endereco.bairro, "Centro", "bairro fica");
    assert.equal(depois.avaliacao.nota, 5);
    assert.equal(depois.avaliacao.comentario, null);
    assert.equal(depois.totais.total, pedido.totais.total);

    // Some da busca, não pode ser editado nem receber pedido novo.
    const busca = await ok(200, "GET", "/clientes?busca=anonimizado", {
      token: admin,
    });
    assert.ok(!busca.dados.some((c: Json) => c.id === cliente.id));
    assert.equal(
      (
        await api("PATCH", `/clientes/${cliente.id}`, {
          token: admin,
          corpo: { nome: "Outro nome" },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await api("POST", "/pedidos", {
          token: atendente.token,
          corpo: {
            canal: "BALCAO",
            clienteId: cliente.id,
            itens: [{ itemVendavelId: produto.id, quantidade: 1 }],
          },
        })
      ).status,
      409,
    );
  });

  it("não anonimiza com pedido em andamento", async () => {
    const cliente = await criarCliente();
    const pedido = await ok(201, "POST", "/pedidos", {
      token: atendente.token,
      corpo: {
        canal: "BALCAO",
        clienteId: cliente.id,
        itens: [{ itemVendavelId: produto.id, quantidade: 1 }],
      },
    });
    const r = await api("POST", `/clientes/${cliente.id}/anonimizacao`, {
      token: admin,
    });
    assert.equal(r.status, 409);
    await avancar(atendente.token, pedido.id, "CANCELADO");
    await ok(200, "POST", `/clientes/${cliente.id}/anonimizacao`, {
      token: admin,
    });
  });

  it("cliente sem pedidos é excluído de verdade", async () => {
    const cliente = await criarCliente();
    await ok(204, "DELETE", `/clientes/${cliente.id}`, { token: admin });
    assert.equal(
      (await api("GET", `/clientes/${cliente.id}`, { token: admin })).status,
      404,
    );
  });
});
