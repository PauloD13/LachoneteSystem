import { describe, expect, it } from "vitest";
import { telaInicial } from "./telaInicial";

describe("telaInicial", () => {
  it("leva cada cargo para a sua tela", () => {
    expect(telaInicial({ cargos: ["atendente"] })).toBe("/inicio");
    expect(telaInicial({ cargos: ["cozinheiro"] })).toBe("/cozinha");
    expect(telaInicial({ cargos: ["entregador"] })).toBe("/entregas");
    expect(telaInicial({ cargos: ["gerente"] })).toBe("/gerencia/pedidos");
  });

  it("quem acumula cargos vai para o mais amplo", () => {
    expect(telaInicial({ cargos: ["entregador", "atendente"] })).toBe(
      "/inicio",
    );
    expect(telaInicial({ cargos: ["cozinheiro", "gerente"] })).toBe(
      "/gerencia/pedidos",
    );
  });

  it("sem cargo vigente, vai para o perfil", () => {
    expect(telaInicial({ cargos: [] })).toBe("/perfil");
  });
});
