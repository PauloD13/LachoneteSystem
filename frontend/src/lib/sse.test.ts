import { describe, expect, it } from "vitest";
import { separarEventos } from "./sse";

describe("separarEventos", () => {
  it("separa eventos completos e guarda o pedaço incompleto", () => {
    const { eventos, resto } = separarEventos(
      ': conectado\n\nevent: pedido\ndata: {"id":1}\n\nevent: ped',
    );
    expect(eventos).toEqual([{ evento: "pedido", dados: '{"id":1}' }]);
    expect(resto).toBe("event: ped");
  });

  it("junta o resto com o pedaço seguinte", () => {
    const primeiro = separarEventos("event: pedido\ndata: {");
    const segundo = separarEventos(primeiro.resto + '"id":2}\n\n');
    expect(segundo.eventos).toEqual([{ evento: "pedido", dados: '{"id":2}' }]);
  });

  it("ignora comentários e aceita fim de linha do Windows", () => {
    const { eventos } = separarEventos(": ping\r\n\r\ndata: oi\r\n\r\n");
    expect(eventos).toEqual([{ evento: "message", dados: "oi" }]);
  });
});
