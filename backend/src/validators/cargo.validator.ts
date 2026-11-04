import { z } from "zod";

// Validação do parâmetro :id da rota
// Se o seu ID no Prisma for String/UUID, troque por: z.string().uuid('ID inválido')
export const cargoIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive("O ID deve ser um número inteiro positivo."),
});

// Schema de criação (POST)
export const criarCargoSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
});

// Schema de atualização parcial (PATCH) — torna todos os campos opcionais
export const atualizarCargoSchema = criarCargoSchema.partial();

export type CriarCargoDTO = z.infer<typeof criarCargoSchema>;
export type AtualizarCargoDTO = z.infer<typeof atualizarCargoSchema>;