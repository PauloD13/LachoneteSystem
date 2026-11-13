import { z } from "zod";
import {
  dia,
  dinheiro,
  idNoCorpo,
  paginacaoQuerySchema,
  tipoDesconto,
} from "./comum.js";

// As regras que cruzam campos (dataFim >= dataInicio, percentual <= 100)
// são validadas no service — ver lib/desconto.ts.
export const criarPromocaoSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
  dataInicio: dia,
  dataFim: dia,
  tipoDesconto,
  valorDesconto: dinheiro.positive("O desconto deve ser maior que zero."),
  produtoIds: z
    .array(idNoCorpo)
    .min(1, "Informe ao menos um produto.")
    .max(500)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Há produto repetido na lista.",
    ),
});

// No PATCH, "produtoIds" (se enviado) substitui a lista inteira.
export const atualizarPromocaoSchema = criarPromocaoSchema.partial();

export const listarPromocoesQuerySchema = paginacaoQuerySchema.extend({
  // Filtra as promoções que estavam em vigor no dia informado.
  ativaEm: dia.optional(),
});

export type CriarPromocaoDTO = z.infer<typeof criarPromocaoSchema>;
export type AtualizarPromocaoDTO = z.infer<typeof atualizarPromocaoSchema>;
export type ListarPromocoesQuery = z.infer<typeof listarPromocoesQuerySchema>;
