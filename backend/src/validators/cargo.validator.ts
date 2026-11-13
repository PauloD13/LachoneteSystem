import { z } from "zod";

// Nome normalizado em minúsculas: "Gerente" e "gerente" são o mesmo cargo.
// Importa porque a aplicação decide permissões pelo nome do cargo (ver
// lib/cargos.ts) e a coluna UNIQUE do Postgres diferencia maiúsculas.
// O limite acompanha a coluna cargo.nome (VARCHAR(30)).
export const criarCargoSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .toLowerCase()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(30, "O nome deve ter no máximo 30 caracteres."),
});

// Schema de atualização parcial (PATCH) — torna todos os campos opcionais
export const atualizarCargoSchema = criarCargoSchema.partial();

export type CriarCargoDTO = z.infer<typeof criarCargoSchema>;
export type AtualizarCargoDTO = z.infer<typeof atualizarCargoSchema>;
