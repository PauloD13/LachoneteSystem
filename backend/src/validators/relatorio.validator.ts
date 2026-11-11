import { z } from "zod";
import { dia } from "./comum.js";

const periodo = {
  dataInicio: dia,
  dataFim: dia,
};

const fimDepoisDoInicio = {
  message: "dataFim não pode ser anterior a dataInicio.",
  path: ["dataFim"],
};

export const periodoQuerySchema = z
  .object(periodo)
  .refine((p) => p.dataFim >= p.dataInicio, fimDepoisDoInicio);

export const maisVendidosQuerySchema = z
  .object({
    ...periodo,
    limite: z.coerce.number().int().min(1).max(100).default(10),
  })
  .refine((p) => p.dataFim >= p.dataInicio, fimDepoisDoInicio);
