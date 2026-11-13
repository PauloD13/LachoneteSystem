import { z } from "zod";
import { dinheiro } from "./comum.js";

export const criarAdicionalSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(50, "O nome deve ter no máximo 50 caracteres."),
  preco: dinheiro,
  // false = fora do cardápio (não entra em pedidos novos), sem perder o
  // histórico dos pedidos em que já foi usado.
  ativo: z.boolean().optional(),
});

export const atualizarAdicionalSchema = criarAdicionalSchema.partial();

export type CriarAdicionalDTO = z.infer<typeof criarAdicionalSchema>;
export type AtualizarAdicionalDTO = z.infer<typeof atualizarAdicionalSchema>;
