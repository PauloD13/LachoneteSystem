import { describe, expect, it } from "vitest";
import { pagamentosSemTroco } from "./montarPedido";

const DINHEIRO = 1;
const PIX = 4;

describe("pagamentosSemTroco", () => {
  it("o excesso em dinheiro vira troco e não é registrado", () => {
    const r = pagamentosSemTroco(
      [
        { chave: "a", formaPagamentoId: DINHEIRO, valor: 50 },
        { chave: "b", formaPagamentoId: PIX, valor: 10 },
      ],
      43.5,
      DINHEIRO,
    );
    expect(r.troco).toBe(16.5);
    expect(r.pagamentos.map((p) => p.valor)).toEqual([33.5, 10]);
  });

  it("sem dinheiro, o excesso fica (o backend recusa)", () => {
    const r = pagamentosSemTroco(
      [{ chave: "a", formaPagamentoId: PIX, valor: 60 }],
      43.5,
      DINHEIRO,
    );
    expect(r.troco).toBe(0);
    expect(r.pagamentos[0].valor).toBe(60);
  });

  it("pagamento menor que o total fica como está (o resto é pago depois)", () => {
    const r = pagamentosSemTroco(
      [{ chave: "a", formaPagamentoId: DINHEIRO, valor: 20 }],
      43.5,
      DINHEIRO,
    );
    expect(r).toEqual({
      pagamentos: [{ chave: "a", formaPagamentoId: DINHEIRO, valor: 20 }],
      troco: 0,
    });
  });
});
