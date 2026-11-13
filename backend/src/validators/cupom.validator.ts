import { z } from "zod";
import { dia, dinheiro, tipoDesconto } from "./comum.js";

// Código normalizado em maiúsculas: "bemvindo10" e "BEMVINDO10" são o mesmo
// cupom (a coluna é UNIQUE e a comparação do Postgres diferencia caixa).
export const codigoCupom = z
  .string({ error: "O código é obrigatório." })
  .trim()
  .toUpperCase()
  .min(3, "O código deve ter pelo menos 3 caracteres.")
  .max(30, "O código deve ter no máximo 30 caracteres.")
  .regex(/^[A-Z0-9_-]+$/, "Use apenas letras, números, hífen e sublinhado.");

// As regras que cruzam campos (dataFim >= dataInicio, percentual <= 100)
// são validadas no service — ver lib/desconto.ts.
export const criarCupomSchema = z.object({
  codigo: codigoCupom,
  tipoDesconto,
  valorDesconto: dinheiro.positive("O desconto deve ser maior que zero."),
  dataInicio: dia,
  dataFim: dia,
});

export const atualizarCupomSchema = criarCupomSchema.partial();

export type CriarCupomDTO = z.infer<typeof criarCupomSchema>;
export type AtualizarCupomDTO = z.infer<typeof atualizarCupomSchema>;
