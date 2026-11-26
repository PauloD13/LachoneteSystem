import { z } from "zod";

// O limite acompanha a coluna (VARCHAR(50)): 400 com mensagem clara em vez
// de erro do banco.
export const criarCategoriaSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(50, "O nome deve ter no máximo 50 caracteres."),
});

export const atualizarCategoriaSchema = criarCategoriaSchema.partial();

export type CriarCategoriaDTO = z.infer<typeof criarCategoriaSchema>;
export type AtualizarCategoriaDTO = z.infer<typeof atualizarCategoriaSchema>;
