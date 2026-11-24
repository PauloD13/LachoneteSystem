import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import {
  api,
  avancar,
  criarCategoria,
  criarCliente,
  criarFuncionario,
  criarProduto,
  dia,
  gerente,
  idDaFormaDePagamento,
  ok,
  unico,
  type Funcionario,
  type Json,
} from "./apoio.ts";

// Cenário compartilhado: uma pequena lanchonete montada uma vez.
let admin: string;
let atendente: Funcionario;
let cozinheiro: Funcionario;
let entregador: Funcionario;
let cliente: Json;
let lanche: Json; // R$ 20,00
let bebida: Json; // R$ 6,00
let combo: Json; // R$ 22,00
let adicional: Json; // R$ 3,00
let variacao: Json; // + R$ 4,00 no lanche
let dinheiro: number;
let pix: number;

before(async () => {
  admin = await gerente();
  [atendente, cozinheiro, entregador] = await Promise.all([
    criarFuncionario("atendente"),
    criarFuncionario("cozinheiro"),
    criarFuncionario("entregador"),
  ]);
  cliente = await criarCliente();
  const categoriaId = await criarCategoria();
  lanche = await criarProduto(categoriaId, 20);
  bebida = await criarProduto(categoriaId, 6);
  combo = await ok(201, "POST", "/combos", {
    token: admin,
    corpo: { nome: unico("Combo"), preco: 22, itens: [{ produtoId: lanche.id }, { produtoId: bebida.id }] },
  });
  adicional = await ok(201, "POST", "/adicionais", { token: admin, corpo: { nome: unico("Bacon"), preco: 3 } });
  variacao = await ok(201, "POST", `/produtos/${lanche.id}/variacoes`, {
    token: admin,
    corpo: { nome: "Duplo", precoAdicional: 4 },
  });
  dinheiro = await idDaFormaDePagamento("dinheiro");
  pix = await idDaFormaDePagamento("pix");
});

const balcao = (extra: object = {}) => ({
  canal: "BALCAO",
  itens: [{ itemVendavelId: lanche.id, quantidade: 1 }],
  ...extra,
});

describe("registro do pedido", () => {
  it("pedido completo: itens, variação, adicionais, combo, totais e status inicial", async () => {
    const pedido = await ok(201, "POST", "/pedidos", {
      token: atendente.token,
      corpo: {
        canal: "BALCAO",
        clienteId: cliente.id,
        itens: [
          { itemVendavelId: lanche.id, quantidade: 2, variacaoId: variacao.id, adicionalIds: [adicional.id], observacao: "sem cebola" },
          { itemVendavelId: combo.id, quantidade: 1 },
        ],
        pagamentos: [{ formaPagamentoId: dinheiro, valorPago: 30 }, { formaPagamentoId: pix, valorPago: 20 }],
      },
    });

    // (20 + 4 + 3) x 2 + 22 = 76
    assert.equal(pedido.totais.subtotalItens, "76.00");
    assert.equal(pedido.totais.total, "76.00");
    assert.equal(pedido.totais.totalPago, "50.00");
    assert.equal(pedido.totais.saldo, "26.00");
    assert.equal(pedido.tipoAtendimento, "RETIRADA");
    // O atendente é quem está logado, sem precisar informar.
    assert.equal(pedido.atendente.id, atendente.id);
    // Status inicial gravado pelo trigger do banco, uma única vez.
    assert.equal(pedido.statusAtual, "RECEBIDO");
    assert.deepEqual(pedido.statusHistorico.map((s: Json) => s.status), ["RECEBIDO"]);

    const relido = await ok(200, "GET", `/pedidos/${pedido.id}`, { token: cozinheiro.token });
    assert.deepEqual(relido, pedido);
  });

  it("só quem exerce o cargo de atendente hoje pode ser o atendente", async () => {
    // Logado como cozinheiro, sem informar atendente: ele mesmo seria o atendente.
    const r1 = await api("POST", "/pedidos", { token: cozinheiro.token, corpo: balcao() });
    assert.equal(r1.status, 409);
    assert.match(r1.corpo.error, /atendente/);
    // O gerente inicial também não é atendente.
    assert.equal((await api("POST", "/pedidos", { token: admin, corpo: balcao() })).status, 409);
    // Mas qualquer logado pode lançar o pedido em nome de um atendente de verdade.
    const pedido = await ok(201, "POST", "/pedidos", { token: admin, corpo: balcao({ atendenteId: atendente.id }) });
    assert.equal(pedido.atendente.id, atendente.id);

    assert.equal((await api("POST", "/pedidos", { token: admin, corpo: balcao({ atendenteId: cozinheiro.id }) })).status, 409);
    assert.equal((await api("POST", "/pedidos", { token: admin, corpo: balcao({ atendenteId: 2_000_000_000 }) })).status, 400);
  });

  it("atendente desativado não registra mais pedidos", async () => {
    const exAtendente = await criarFuncionario("atendente");
    await ok(200, "PATCH", `/funcionarios/${exAtendente.id}`, { token: admin, corpo: { ativo: false } });
    const r = await api("POST", "/pedidos", { token: admin, corpo: balcao({ atendenteId: exAtendente.id }) });
    assert.equal(r.status, 409);
  });

  it("item, adicional ou componente de combo desativado não entra em pedido novo", async () => {
    const categoriaId = await criarCategoria();
    const a = await criarProduto(categoriaId, 10);
    const b = await criarProduto(categoriaId, 10);
    const kit = await ok(201, "POST", "/combos", {
      token: admin,
      corpo: { nome: unico("Kit"), preco: 15, itens: [{ produtoId: a.id }, { produtoId: b.id }] },
    });
    const extra = await ok(201, "POST", "/adicionais", { token: admin, corpo: { nome: unico("Extra"), preco: 1 } });
    const pedir = (itens: unknown) => api("POST", "/pedidos", { token: atendente.token, corpo: { canal: "BALCAO", itens } });

    // Vendido uma vez enquanto ativo.
    const antigo = await pedir([{ itemVendavelId: a.id, quantidade: 1, adicionalIds: [extra.id] }]);
    assert.equal(antigo.status, 201);

    await ok(200, "PATCH", `/produtos/${a.id}`, { token: admin, corpo: { ativo: false } });
    await ok(200, "PATCH", `/adicionais/${extra.id}`, { token: admin, corpo: { ativo: false } });

    assert.equal((await pedir([{ itemVendavelId: a.id, quantidade: 1 }])).status, 409);
    assert.equal((await pedir([{ itemVendavelId: kit.id, quantidade: 1 }])).status, 409);
    assert.equal((await pedir([{ itemVendavelId: b.id, quantidade: 1, adicionalIds: [extra.id] }])).status, 409);
    assert.equal((await pedir([{ itemVendavelId: b.id, quantidade: 1 }])).status, 201);

    // O pedido antigo continua íntegro, e o produto vendido não pode ser apagado.
    const relido = await ok(200, "GET", `/pedidos/${antigo.corpo.id}`, { token: admin });
    assert.equal(relido.itens[0].adicionais.length, 1);
    const remocao = await api("DELETE", `/produtos/${a.id}`, { token: admin });
    assert.equal(remocao.status, 409);
    assert.match(remocao.corpo.error, /desative/);
  });

  it("regras de quem precisa de cadastro, mesa e validações do corpo", async () => {
    const t = atendente.token;
    const invalidos: object[] = [
      { canal: "APP", itens: [{ itemVendavelId: lanche.id, quantidade: 1 }] },
      balcao({ entrega: { taxaEntrega: 5 } }),
      balcao({ cupomCodigo: "QUALQUER" }),
      balcao({ itens: [] }),
      balcao({ itens: [{ itemVendavelId: lanche.id, quantidade: 0 }] }),
      balcao({ itens: [{ itemVendavelId: lanche.id, quantidade: 1.5 }] }),
      balcao({ canal: "DRONE" }),
    ];
    for (const corpo of invalidos) {
      const r = await api("POST", "/pedidos", { token: t, corpo });
      assert.equal(r.status, 400, JSON.stringify(corpo));
    }
    // Variação de outro produto.
    const r = await api("POST", "/pedidos", {
      token: t,
      corpo: balcao({ itens: [{ itemVendavelId: bebida.id, quantidade: 1, variacaoId: variacao.id }] }),
    });
    assert.equal(r.status, 400);
    // Pagamento acima do total.
    const pago = await api("POST", "/pedidos", {
      token: t,
      corpo: balcao({ pagamentos: [{ formaPagamentoId: dinheiro, valorPago: 20.01 }] }),
    });
    assert.equal(pago.status, 409);
  });

  it("preço congelado: promoção do dia entra no preço; mudar o cardápio depois não altera o pedido", async () => {
    const produto = await criarProduto(await criarCategoria(), 50);
    await ok(201, "POST", "/promocoes", {
      token: admin,
      corpo: { nome: unico("Promo"), dataInicio: dia(0), dataFim: dia(0), tipoDesconto: "PERCENTUAL", valorDesconto: 20, produtoIds: [produto.id] },
    });
    // Duas promoções não acumulam: vale a melhor.
    await ok(201, "POST", "/promocoes", {
      token: admin,
      corpo: { nome: unico("Promo"), dataInicio: dia(-1), dataFim: dia(1), tipoDesconto: "VALOR", valorDesconto: 5, produtoIds: [produto.id] },
    });
    const pedido = await ok(201, "POST", "/pedidos", {
      token: atendente.token,
      corpo: { canal: "BALCAO", itens: [{ itemVendavelId: produto.id, quantidade: 1 }] },
    });
    assert.equal(pedido.itens[0].precoUnitarioPraticado, "40.00");

    await ok(200, "PATCH", `/produtos/${produto.id}`, { token: admin, corpo: { preco: 99 } });
    const relido = await ok(200, "GET", `/pedidos/${pedido.id}`, { token: admin });
    assert.equal(relido.itens[0].precoUnitarioPraticado, "40.00");
    assert.equal(relido.totais.total, "40.00");
  });
});

describe("ciclo de vida do pedido", () => {
  it("retirada: status avança em ordem, com histórico datado, e aceita avaliação no fim", async () => {
    const t = atendente.token;
    const pedido = await ok(201, "POST", "/pedidos", { token: t, corpo: balcao() });
    const rota = `/pedidos/${pedido.id}`;

    assert.equal((await api("POST", `${rota}/status`, { token: t, corpo: { status: "PRONTO" } })).status, 409);
    assert.equal((await api("POST", `${rota}/avaliacao`, { token: t, corpo: { nota: 5 } })).status, 409);

    await avancar(cozinheiro.token, pedido.id, "EM_PREPARO", "PRONTO");
    assert.equal((await api("POST", `${rota}/status`, { token: t, corpo: { status: "SAIU_PARA_ENTREGA" } })).status, 409);
    const entregue = await avancar(t, pedido.id, "ENTREGUE_RETIRADO");

    assert.equal(entregue.statusAtual, "ENTREGUE_RETIRADO");
    assert.deepEqual(
      entregue.statusHistorico.map((s: Json) => s.status),
      ["RECEBIDO", "EM_PREPARO", "PRONTO", "ENTREGUE_RETIRADO"],
    );
    const horarios = entregue.statusHistorico.map((s: Json) => Date.parse(s.dataHora));
    assert.deepEqual(horarios, [...horarios].sort((a, b) => a - b));
    // Instantes saem em UTC (TIMESTAMPTZ), próximos de agora.
    assert.match(entregue.dataHora, /Z$/);
    assert.ok(Math.abs(Date.parse(entregue.dataHora) - Date.now()) < 5 * 60 * 1000);

    assert.equal((await api("POST", `${rota}/status`, { token: t, corpo: { status: "CANCELADO" } })).status, 409);
    assert.equal((await api("POST", `${rota}/avaliacao`, { token: t, corpo: { nota: 6 } })).status, 400);
    await ok(201, "POST", `${rota}/avaliacao`, { token: t, corpo: { nota: 5, comentario: "Ótimo" } });
    assert.equal((await api("POST", `${rota}/avaliacao`, { token: t, corpo: { nota: 1 } })).status, 409);
  });

  it("entrega: nasce sem entregador, que é exigido (e validado pelo cargo) antes de sair", async () => {
    const t = atendente.token;
    const pedido = await ok(201, "POST", "/pedidos", {
      token: t,
      corpo: {
        canal: "TELEFONE",
        clienteId: cliente.id,
        itens: [{ itemVendavelId: lanche.id, quantidade: 1 }],
        entrega: { taxaEntrega: 7.5 },
      },
    });
    const rota = `/pedidos/${pedido.id}`;
    assert.equal(pedido.tipoAtendimento, "ENTREGA");
    assert.equal(pedido.entrega.entregador, null);
    // Endereço copiado do cadastro do cliente.
    assert.equal(pedido.entrega.endereco.logradouro, "Rua das Flores");
    assert.equal(pedido.totais.total, "27.50");

    await avancar(cozinheiro.token, pedido.id, "EM_PREPARO", "PRONTO");
    const semEntregador = await api("POST", `${rota}/status`, { token: t, corpo: { status: "SAIU_PARA_ENTREGA" } });
    assert.equal(semEntregador.status, 409);
    assert.match(semEntregador.corpo.error, /entregador/);
    assert.equal((await api("POST", `${rota}/status`, { token: t, corpo: { status: "ENTREGUE_RETIRADO" } })).status, 409);

    // Cozinheiro não é entregador.
    assert.equal((await api("PATCH", `${rota}/entrega`, { token: t, corpo: { entregadorId: cozinheiro.id } })).status, 409);
    assert.equal((await api("PATCH", `${rota}/entrega`, { token: t, corpo: { entregadorId: 2_000_000_000 } })).status, 400);
    const comEntregador = await ok(200, "PATCH", `${rota}/entrega`, { token: t, corpo: { entregadorId: entregador.id } });
    assert.equal(comEntregador.entrega.entregador.id, entregador.id);

    const saiu = await avancar(entregador.token, pedido.id, "SAIU_PARA_ENTREGA");
    assert.ok(saiu.entrega.dataHoraSaida);
    assert.equal((await api("PATCH", `${rota}/entrega`, { token: t, corpo: { entregadorId: null } })).status, 409);
    const entregue = await avancar(entregador.token, pedido.id, "ENTREGUE_RETIRADO");
    assert.ok(entregue.entrega.dataHoraEntrega);
  });

  it("entrega pode já nascer com entregador — desde que ele seja entregador", async () => {
    const corpo = (entregadorId: number) => ({
      canal: "APP",
      clienteId: cliente.id,
      itens: [{ itemVendavelId: bebida.id, quantidade: 1 }],
      entrega: { entregadorId, taxaEntrega: 0, endereco: { logradouro: "Av. Brasil", numero: "500", bairro: "Jardins", cidade: "São Paulo", cep: "01400-000" } },
    });
    assert.equal((await api("POST", "/pedidos", { token: atendente.token, corpo: corpo(atendente.id) })).status, 409);
    const pedido = await ok(201, "POST", "/pedidos", { token: atendente.token, corpo: corpo(entregador.id) });
    assert.equal(pedido.entrega.entregador.id, entregador.id);
    assert.equal(pedido.entrega.endereco.logradouro, "Av. Brasil");
  });

  it("pagamentos parciais nunca passam do total", async () => {
    const t = atendente.token;
    const pedido = await ok(201, "POST", "/pedidos", { token: t, corpo: balcao() });
    const rota = `/pedidos/${pedido.id}/pagamentos`;
    await ok(201, "POST", rota, { token: t, corpo: { formaPagamentoId: dinheiro, valorPago: 12.5 } });
    assert.equal((await api("POST", rota, { token: t, corpo: { formaPagamentoId: pix, valorPago: 7.51 } })).status, 409);
    assert.equal((await api("POST", rota, { token: t, corpo: { formaPagamentoId: 2_000_000_000, valorPago: 1 } })).status, 400);
    const quitado = await ok(201, "POST", rota, { token: t, corpo: { formaPagamentoId: pix, valorPago: 7.5 } });
    assert.equal(quitado.totais.saldo, "0.00");
    assert.equal(quitado.pagamentos.length, 2);
  });

  it("cancelar pedido pago estorna os pagamentos e devolve o cupom ao cliente", async () => {
    const t = atendente.token;
    const freguês = await criarCliente();
    const codigo = unico("VOLTA").toUpperCase();
    await ok(201, "POST", "/cupons", {
      token: admin,
      corpo: { codigo, tipoDesconto: "VALOR", valorDesconto: 5, dataInicio: dia(-1), dataFim: dia(1) },
    });
    const comCupom = () => ({
      canal: "BALCAO",
      clienteId: freguês.id,
      cupomCodigo: codigo.toLowerCase(),
      itens: [{ itemVendavelId: lanche.id, quantidade: 1 }],
      pagamentos: [{ formaPagamentoId: dinheiro, valorPago: 10 }],
    });

    const pedido = await ok(201, "POST", "/pedidos", { token: t, corpo: comCupom() });
    assert.equal(pedido.totais.descontoCupom, "5.00");
    assert.equal(pedido.totais.total, "15.00");
    // Um uso por cliente.
    assert.equal((await api("POST", "/pedidos", { token: t, corpo: comCupom() })).status, 409);

    const cancelado = await avancar(t, pedido.id, "CANCELADO");
    assert.equal(cancelado.statusAtual, "CANCELADO");
    assert.equal(cancelado.pagamentos.length, 1);
    assert.ok(cancelado.pagamentos[0].estornadoEm, "pagamento deveria estar estornado");
    assert.equal(cancelado.totais.totalPago, "0.00");
    assert.equal(cancelado.totais.totalEstornado, "10.00");
    assert.equal(cancelado.totais.saldo, "0.00");

    const rota = `/pedidos/${pedido.id}`;
    assert.equal((await api("POST", `${rota}/pagamentos`, { token: t, corpo: { formaPagamentoId: dinheiro, valorPago: 1 } })).status, 409);
    assert.equal((await api("POST", `${rota}/status`, { token: t, corpo: { status: "EM_PREPARO" } })).status, 409);

    // Cupom liberado: o cliente pode usá-lo em outro pedido.
    await ok(201, "POST", "/pedidos", { token: t, corpo: comCupom() });
  });
});

describe("consultas e relatórios", () => {
  it("filtro por status usa o status atual (e não qualquer status do histórico)", async () => {
    const t = atendente.token;
    const freguês = await criarCliente();
    const novo = (extra: object = {}) =>
      ok(201, "POST", "/pedidos", { token: t, corpo: balcao({ clienteId: freguês.id, ...extra }) });
    const a = await novo();
    const b = await novo();
    const c = await novo();
    await avancar(t, b.id, "EM_PREPARO");
    await avancar(t, c.id, "EM_PREPARO", "PRONTO");

    const ids = async (filtro: string) =>
      (await ok(200, "GET", `/pedidos?clienteId=${freguês.id}&${filtro}`, { token: t })).dados.map((p: Json) => p.id);
    assert.deepEqual(await ids("status=RECEBIDO"), [a.id]);
    assert.deepEqual(await ids("status=EM_PREPARO"), [b.id]);
    assert.deepEqual(await ids("status=PRONTO"), [c.id]);
    assert.deepEqual(await ids("status=CANCELADO"), []);
    // Mais recentes primeiro; período em dias no fuso do negócio.
    assert.deepEqual(await ids(`dataInicio=${dia(0)}&dataFim=${dia(0)}`), [c.id, b.id, a.id]);
    assert.deepEqual(await ids(`dataInicio=${dia(1)}`), []);
    assert.deepEqual(await ids(`dataFim=${dia(-1)}`), []);

    // Histórico do cliente (regra 4.1).
    const historico = await ok(200, "GET", `/clientes/${freguês.id}/pedidos`, { token: t });
    assert.equal(historico.paginacao.total, 3);
    assert.equal((await api("GET", "/clientes/2000000000/pedidos", { token: t })).status, 404);
    // Cliente com pedidos não pode ser apagado.
    assert.equal((await api("DELETE", `/clientes/${freguês.id}`, { token: admin })).status, 409);
  });

  it("relatórios somam as vendas do período e ignoram pedidos cancelados", async () => {
    const categoriaId = await criarCategoria();
    const produto = await criarProduto(categoriaId, 10);
    const fornecedor = await ok(201, "POST", "/fornecedores", { token: admin, corpo: { nome: unico("Fornecedor") } });
    const ingrediente = await ok(201, "POST", "/ingredientes", {
      token: admin,
      corpo: { nome: unico("Queijo"), unidadeMedida: "kg", quantidadeEstoque: 5, fornecedorId: fornecedor.id },
    });
    await ok(200, "PUT", `/produtos/${produto.id}/ingredientes/${ingrediente.id}`, {
      token: admin,
      corpo: { quantidadeUtilizada: 0.05 },
    });
    const vendedor = await criarFuncionario("atendente");
    const pedir = (quantidade: number) =>
      ok(201, "POST", "/pedidos", {
        token: vendedor.token,
        corpo: { canal: "BALCAO", itens: [{ itemVendavelId: produto.id, quantidade }] },
      });
    await pedir(3);
    await pedir(2);
    const cancelado = await pedir(100);
    await avancar(vendedor.token, cancelado.id, "CANCELADO");

    const periodo = `dataInicio=${dia(0)}&dataFim=${dia(0)}`;
    const vendidos = await ok(200, "GET", `/relatorios/mais-vendidos?${periodo}&limite=100`, { token: admin });
    const linha = vendidos.find((v: Json) => v.itemVendavelId === produto.id);
    assert.equal(linha.quantidadeVendida, 5);
    assert.equal(linha.receita, "50.00");

    const consumo = await ok(200, "GET", `/relatorios/consumo-ingredientes?${periodo}`, { token: admin });
    assert.equal(consumo.find((c: Json) => c.ingredienteId === ingrediente.id).consumoEstimado, "0.250");

    const porAtendente = await ok(200, "GET", `/relatorios/vendas-por-atendente?${periodo}`, { token: admin });
    const dele = porAtendente.find((v: Json) => v.funcionarioId === vendedor.id);
    assert.equal(dele.quantidadePedidos, 2);
    assert.equal(dele.totalVendido, "50.00");

    assert.equal((await api("GET", `/relatorios/mais-vendidos?dataInicio=${dia(0)}&dataFim=${dia(-1)}`, { token: admin })).status, 400);
    assert.equal((await api("GET", "/relatorios/mais-vendidos", { token: admin })).status, 400);
  });
});
