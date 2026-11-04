import { z } from "zod";

// Validação do parâmetro :id da rota
// Se o seu ID no Prisma for String/UUID, troque por: z.string().uuid('ID inválido')
export const categoriaIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive("O ID deve ser um número inteiro positivo."),
});

// Schema de criação (POST)
export const criarCategoriaSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
});

// Schema de atualização parcial (PATCH) — torna todos os campos opcionais
export const atualizarCategoriaSchema = criarCategoriaSchema.partial();

export type CriarCategoriaDTO = z.infer<typeof criarCategoriaSchema>;
export type AtualizarCategoriaDTO = z.infer<typeof atualizarCategoriaSchema>;