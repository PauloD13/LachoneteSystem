import { describe, expect, it } from "vitest";
import { destinoAposEntrar, telaInicial } from "./telaInicial";

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

describe("destinoAposEntrar", () => {
  const ana = { id: 2, cargos: ["atendente"] };
  const gerente = { id: 1, cargos: ["gerente"] };

  it("sem tela de retorno (saiu pelo botão Sair), vai para a tela do cargo", () => {
    expect(destinoAposEntrar(null, ana)).toBe("/inicio");
    expect(destinoAposEntrar({}, gerente)).toBe("/gerencia/pedidos");
  });

  it("a mesma pessoa volta para onde estava quando a sessão expirou", () => {
    expect(
      destinoAposEntrar(
        { de: { pathname: "/pedidos/12", search: "?x=1" }, quem: 2 },
        ana,
      ),
    ).toBe("/pedidos/12?x=1");
  });

  it("outra pessoa no mesmo aparelho começa na própria tela", () => {
    expect(
      destinoAposEntrar({ de: { pathname: "/gerencia/equipe" }, quem: 1 }, ana),
    ).toBe("/inicio");
    expect(
      destinoAposEntrar({ de: { pathname: "/perfil" }, quem: 1 }, ana),
    ).toBe("/inicio");
  });

  it("não volta para tela de gerência sem o cargo de gerente", () => {
    expect(
      destinoAposEntrar(
        { de: { pathname: "/gerencia/estoque" }, quem: 2 },
        ana,
      ),
    ).toBe("/inicio");
  });
});
