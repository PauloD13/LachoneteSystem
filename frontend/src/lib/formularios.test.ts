import { describe, expect, it } from "vitest";
import { campoDeDinheiro, numeroDoCampo, textoOuNulo } from "./formularios";

describe("formulários", () => {
  it("texto vazio vira null", () => {
    expect(textoOuNulo("  ")).toBeNull();
    expect(textoOuNulo(" Ana ")).toBe("Ana");
  });

  it("aceita número com vírgula ou ponto", () => {
    expect(numeroDoCampo("12,50")).toBe(12.5);
    expect(numeroDoCampo("12.5")).toBe(12.5);
    expect(numeroDoCampo("1.234,56")).toBe(1234.56);
    expect(numeroDoCampo("")).toBeNaN();
  });

  it("formata dinheiro para o campo", () => {
    expect(campoDeDinheiro("7.5")).toBe("7,50");
    expect(campoDeDinheiro(null)).toBe("");
  });
});
