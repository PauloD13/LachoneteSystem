import { describe, expect, it } from "vitest";
import { itemAtual } from "./selecao";

const ana = { id: 1, nome: "Ana" };
const bia = { id: 2, nome: "Bia" };
const caio = { id: 3, nome: "Caio" };

describe("itemAtual", () => {
  it("sem escolha, o primeiro; com escolha, o escolhido", () => {
    expect(itemAtual([ana, bia], null, null, false)).toBe(ana);
    expect(itemAtual([ana, bia], 2, null, false)).toBe(bia);
    expect(itemAtual(undefined, null, null, true)).toBeNull();
  });

  it("recém-salvo não some nem vira o primeiro enquanto a lista recarrega", () => {
    // Lista antiga, sem o Caio: antes do ajuste, o editor mostrava a Ana.
    expect(itemAtual([ana, bia], 3, caio, true)).toBe(caio);
    expect(itemAtual([ana, bia], 3, caio, false)).toBe(caio);
    const caioRecarregado = { ...caio };
    expect(itemAtual([ana, bia, caioRecarregado], 3, caio, false)).toBe(
      caioRecarregado,
    );
  });

  it("editado: mostra a versão salva enquanto a lista antiga recarrega", () => {
    const biaEditada = { ...bia, nome: "Beatriz" };
    expect(itemAtual([ana, bia], 2, biaEditada, true)).toBe(biaEditada);
  });

  it("escolhido que saiu da lista (outro filtro) volta para o primeiro", () => {
    expect(itemAtual([ana], 2, null, false)).toBe(ana);
  });
});
