import { z } from "zod";
import {
  idNaUrl,
  idNoCorpo,
  paginacaoQuerySchema,
  quantidadeDecimal,
} from "./comum.js";

export const criarIngredienteSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
  quantidadeEstoque: quantidadeDecimal.optional(),
  unidadeMedida: z.enum(["kg", "litro", "unidade"], {
    error: "unidadeMedida deve ser kg, litro ou unidade.",
  }),
  fornecedorId: idNoCorpo,
});

export const atualizarIngredienteSchema = criarIngredienteSchema.partial();

export const listarIngredientesQuerySchema = paginacaoQuerySchema.extend({
  fornecedorId: idNaUrl.optional(),
});

export type CriarIngredienteDTO = z.infer<typeof criarIngredienteSchema>;
export type AtualizarIngredienteDTO = z.infer<
  typeof atualizarIngredienteSchema
>;
export type ListarIngredientesQuery = z.infer<
  typeof listarIngredientesQuerySchema
>;
