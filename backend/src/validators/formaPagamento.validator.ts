import { z } from "zod";

export const criarFormaPagamentoSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(30, "O nome deve ter no máximo 30 caracteres."),
});

export const atualizarFormaPagamentoSchema =
  criarFormaPagamentoSchema.partial();

export type CriarFormaPagamentoDTO = z.infer<typeof criarFormaPagamentoSchema>;
export type AtualizarFormaPagamentoDTO = z.infer<
  typeof atualizarFormaPagamentoSchema
>;
