import { z } from "zod";
import { dinheiro, idNaUrl } from "./comum.js";

export const produtoIdParamSchema = z.object({ produtoId: idNaUrl });

export const variacaoParamSchema = produtoIdParamSchema.extend({
  variacaoId: idNaUrl,
});

export const criarVariacaoSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(1, "O nome é obrigatório.")
    .max(50, "O nome deve ter no máximo 50 caracteres."),
  // Valor somado ao preço-base do produto quando a variação é escolhida.
  precoAdicional: dinheiro.optional(),
});

export const atualizarVariacaoSchema = criarVariacaoSchema.partial();

export type CriarVariacaoDTO = z.infer<typeof criarVariacaoSchema>;
export type AtualizarVariacaoDTO = z.infer<typeof atualizarVariacaoSchema>;
