import { describe, expect, it } from "vitest";
import {
  dataHora,
  dia,
  diaParaInput,
  hojeISO,
  moeda,
  paraNumero,
} from "./formatadores";

// O Intl usa espaço não separável entre "R$" e o número.
const semEspacoEspecial = (texto: string) => texto.replace(/\s/g, " ");

describe("moeda", () => {
  it("formata o texto que a API devolve", () => {
    expect(semEspacoEspecial(moeda("27.5"))).toBe("R$ 27,50");
    expect(semEspacoEspecial(moeda("1234.5"))).toBe("R$ 1.234,50");
  });

  it("aceita número e trata vazio como zero", () => {
    expect(semEspacoEspecial(moeda(10))).toBe("R$ 10,00");
    expect(semEspacoEspecial(moeda(null))).toBe("R$ 0,00");
    expect(semEspacoEspecial(moeda("abc"))).toBe("R$ 0,00");
  });
});

describe("paraNumero", () => {
  it("converte o texto da API para fazer conta", () => {
    expect(paraNumero("6.00") + paraNumero("0.10")).toBeCloseTo(6.1);
    expect(paraNumero(undefined)).toBe(0);
  });
});

describe("dia", () => {
  it("não volta um dia por causa do fuso (meia-noite UTC)", () => {
    expect(dia("2027-01-04T00:00:00.000Z")).toBe("04/01/2027");
  });

  it("aceita AAAA-MM-DD puro e vazio", () => {
    expect(dia("2026-12-31")).toBe("31/12/2026");
    expect(dia(null)).toBe("");
  });

  it("diaParaInput devolve o formato do <input type=date>", () => {
    expect(diaParaInput("2027-01-04T00:00:00.000Z")).toBe("2027-01-04");
  });
});

describe("datas no fuso do negócio", () => {
  it("dataHora mostra o horário de Brasília, seja qual for o fuso da máquina", () => {
    // 01:30 UTC do dia 25 = 22:30 do dia 24 em Brasília
    expect(dataHora("2026-11-25T01:30:00.000Z")).toBe("24/11/2026, 22:30");
  });

  it("hojeISO usa o dia de Brasília, não o UTC", () => {
    expect(hojeISO(new Date("2026-11-25T01:30:00.000Z"))).toBe("2026-11-24");
    expect(hojeISO(new Date("2026-11-25T15:00:00.000Z"))).toBe("2026-11-25");
  });
});
