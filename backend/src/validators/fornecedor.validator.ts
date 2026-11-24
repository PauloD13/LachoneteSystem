import { z } from "zod";

export const criarFornecedorSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(150, "O nome deve ter no máximo 150 caracteres."),
  telefone: z.string().trim().max(20).nullish(),
  email: z
    .string()
    .trim()
    .email("Formato de e-mail inválido.")
    .max(150)
    .nullish(),
});

export const atualizarFornecedorSchema = criarFornecedorSchema.partial();

export type CriarFornecedorDTO = z.infer<typeof criarFornecedorSchema>;
export type AtualizarFornecedorDTO = z.infer<typeof atualizarFornecedorSchema>;
