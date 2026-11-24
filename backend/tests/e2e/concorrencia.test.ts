import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import {
  api,
  criarCategoria,
  criarCliente,
  criarFuncionario,
  criarProduto,
  dia,
  gerente,
  idDaFormaDePagamento,
  idsDosCargos,
  ok,
  unico,
  type Funcionario,
  type Json,
} from "./apoio.ts";

// "E se dois cliques chegarem ao mesmo tempo?" Cada teste dispara N
// requisições idênticas em paralelo e confere que só UMA teve efeito. É o
// que as travas (SELECT ... FOR UPDATE) e os índices únicos do banco garantem
// — uma checagem só no código da aplicação não seguraria.

const SIMULTANEAS = 10;
const emParalelo = (acao: () => Promise<{ status: number }>) =>
  Promise.all(Array.from({ length: SIMULTANEAS }, acao));
const contar = (respostas: { status: number }[], status: number) =>
  respostas.filter((r) => r.status === status).length;

let admin: string;
let atendente: Funcionario;
let produto: Json; // R$ 10,00
let dinheiro: number;

before(async () => {
  admin = await gerente();
  atendente = await criarFuncionario("atendente");
  produto = await criarProduto(await criarCategoria(), 10);
  dinheiro = await idDaFormaDePagamento("dinheiro");
});

const novoPedido = (extra: object = {}) =>
  ok(201, "POST", "/pedidos", {
    token: atendente.token,
    corpo: { canal: "BALCAO", itens: [{ itemVendavelId: produto.id, quantidade: 1 }], ...extra },
  });

describe("requisições simultâneas", () => {
  it("10 pagamentos do valor total ao mesmo tempo: só um é aceito", async () => {
    const pedido = await novoPedido();
    const respostas = await emParalelo(() =>
      api("POST", `/pedidos/${pedido.id}/pagamentos`, {
        token: atendente.token,
        corpo: { formaPagamentoId: dinheiro, valorPago: 10 },
      }),
    );
    assert.equal(contar(respostas, 201), 1);
    assert.equal(contar(respostas, 409), SIMULTANEAS - 1);
    const final = await ok(200, "GET", `/pedidos/${pedido.id}`, { token: admin });
    assert.equal(final.totais.totalPago, "10.00");
  });

  it("10 mudanças de status iguais ao mesmo tempo: o histórico ganha uma linha só", async () => {
    const pedido = await novoPedido();
    const respostas = await emParalelo(() =>
      api("POST", `/pedidos/${pedido.id}/status`, {
        token: atendente.token,
        corpo: { status: "EM_PREPARO" },
      }),
    );
    assert.equal(contar(respostas, 200), 1);
    const final = await ok(200, "GET", `/pedidos/${pedido.id}`, { token: admin });
    assert.deepEqual(final.statusHistorico.map((s: Json) => s.status), ["RECEBIDO", "EM_PREPARO"]);
    assert.equal(final.statusAtual, "EM_PREPARO");
  });

  it("cancelar e avançar ao mesmo tempo: o status atual sempre bate com o histórico", async () => {
    for (let rodada = 0; rodada < 5; rodada += 1) {
      const pedido = await novoPedido({ pagamentos: [{ formaPagamentoId: dinheiro, valorPago: 10 }] });
      await Promise.all(
        ["CANCELADO", "EM_PREPARO", "CANCELADO", "EM_PREPARO"].map((status) =>
          api("POST", `/pedidos/${pedido.id}/status`, { token: atendente.token, corpo: { status } }),
        ),
      );
      const final = await ok(200, "GET", `/pedidos/${pedido.id}`, { token: admin });
      assert.equal(final.statusAtual, final.statusHistorico.at(-1).status);
      const cancelados = final.statusHistorico.filter((s: Json) => s.status === "CANCELADO").length;
      assert.ok(cancelados <= 1);
      // Estornado se, e somente se, terminou cancelado.
      assert.equal(Boolean(final.pagamentos[0].estornadoEm), final.statusAtual === "CANCELADO");
    }
  });

  it("10 pedidos com o mesmo cupom para o mesmo cliente: só um usa o cupom", async () => {
    const cliente = await criarCliente(false);
    const codigo = unico("UNICO").toUpperCase();
    await ok(201, "POST", "/cupons", {
      token: admin,
      corpo: { codigo, tipoDesconto: "PERCENTUAL", valorDesconto: 10, dataInicio: dia(0), dataFim: dia(0) },
    });
    const respostas = await emParalelo(() =>
      api("POST", "/pedidos", {
        token: atendente.token,
        corpo: {
          canal: "BALCAO",
          clienteId: cliente.id,
          cupomCodigo: codigo,
          itens: [{ itemVendavelId: produto.id, quantidade: 1 }],
        },
      }),
    );
    assert.equal(contar(respostas, 201), 1);
    assert.equal(contar(respostas, 409), SIMULTANEAS - 1);
  });

  it("10 avaliações ao mesmo tempo: o pedido fica com uma", async () => {
    const pedido = await novoPedido();
    for (const status of ["EM_PREPARO", "PRONTO", "ENTREGUE_RETIRADO"]) {
      await ok(200, "POST", `/pedidos/${pedido.id}/status`, { token: atendente.token, corpo: { status } });
    }
    const respostas = await emParalelo(() =>
      api("POST", `/pedidos/${pedido.id}/avaliacao`, { token: atendente.token, corpo: { nota: 4 } }),
    );
    assert.equal(contar(respostas, 201), 1);
    assert.equal(contar(respostas, 409), SIMULTANEAS - 1);
  });

  it("abrir o mesmo cargo 10 vezes e encerrar 10 vezes: um vínculo, um encerramento", async () => {
    const f = await criarFuncionario();
    const { cozinheiro } = await idsDosCargos();
    const rota = `/funcionarios/${f.id}/cargos`;

    const aberturas = await emParalelo(() => api("POST", rota, { token: admin, corpo: { cargoId: cozinheiro } }));
    assert.equal(contar(aberturas, 201), 1);
    assert.equal(contar(aberturas, 409), SIMULTANEAS - 1);

    const [vinculo] = await ok(200, "GET", rota, { token: admin });
    const encerramentos = await emParalelo(() => api("PATCH", `${rota}/${vinculo.id}`, { token: admin }));
    assert.equal(contar(encerramentos, 200), 1);
    assert.equal(contar(encerramentos, 409), SIMULTANEAS - 1);
  });

  it("10 cadastros com o mesmo login: um só", async () => {
    const login = unico("gemeo");
    const respostas = await emParalelo(() =>
      api("POST", "/funcionarios", { token: admin, corpo: { nome: "Gêmeo", login, senha: "senha-de-teste-123" } }),
    );
    assert.equal(contar(respostas, 201), 1);
    assert.equal(contar(respostas, 409), SIMULTANEAS - 1);
  });
});
