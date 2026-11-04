import { z } from "zod";

// Validação do parâmetro :id da rota
export const funcionarioIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive("O ID deve ser um número inteiro positivo."),
});

// Schema de criação (POST)
// "telefone" e "email" são opcionais no model Funcionario (schema.prisma /
// database/init/001_schema.sql só exige "nome" como NOT NULL).
export const criarFuncionarioSchema = z.object({
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

// Schema de atualização parcial (PATCH)
export const atualizarFuncionarioSchema = criarFuncionarioSchema.partial();

export type CriarFuncionarioDTO = z.infer<typeof criarFuncionarioSchema>;
export type AtualizarFuncionarioDTO = z.infer<typeof atualizarFuncionarioSchema>;
