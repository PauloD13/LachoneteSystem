import { z } from "zod";

// Schema de criação (POST). O limite acompanha a coluna categoria.nome
// (VARCHAR(50)): validar aqui devolve um 400 com mensagem clara em vez de
// deixar o banco recusar.
export const criarCategoriaSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(50, "O nome deve ter no máximo 50 caracteres."),
});

// Schema de atualização parcial (PATCH) — torna todos os campos opcionais
export const atualizarCategoriaSchema = criarCategoriaSchema.partial();

export type CriarCategoriaDTO = z.infer<typeof criarCategoriaSchema>;
export type AtualizarCategoriaDTO = z.infer<typeof atualizarCategoriaSchema>;
