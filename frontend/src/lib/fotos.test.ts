import { describe, expect, it } from "vitest";
import { medidasReduzidas, urlDaFoto } from "./fotos";

describe("medidasReduzidas", () => {
  it("reduz pelo maior lado mantendo a proporção", () => {
    expect(medidasReduzidas(4000, 3000)).toEqual({ largura: 800, altura: 600 });
    expect(medidasReduzidas(1080, 1920)).toEqual({ largura: 450, altura: 800 });
  });

  it("não amplia foto pequena", () => {
    expect(medidasReduzidas(300, 200)).toEqual({ largura: 300, altura: 200 });
  });
});

it("urlDaFoto leva a versão (para o cache)", () => {
  expect(urlDaFoto(7, 123)).toBe("/api/produtos/7/foto?v=123");
});
