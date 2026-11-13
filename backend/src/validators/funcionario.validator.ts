import { z } from "zod";
import { loginDeAcesso, senhaNova } from "./auth.validator.js";
import { listarComAtivoQuerySchema } from "./comum.js";

const camposBasicos = {
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(150, "O nome deve ter no máximo 150 caracteres."),
  // "telefone" e "email" são opcionais no model Funcionario.
  telefone: z.string().trim().max(20).nullish(),
  email: z
    .string()
    .trim()
    .email("Formato de e-mail inválido.")
    .max(150)
    .nullish(),
  // false = funcionário desligado: sai das escalas e perde o acesso, mas os
  // pedidos e cargos do passado continuam apontando para ele.
  ativo: z.boolean().optional(),
};

// Schema de criação (POST). Acesso ao sistema é opcional — mas login e senha
// só fazem sentido juntos.
export const criarFuncionarioSchema = z
  .object({
    ...camposBasicos,
    login: loginDeAcesso.optional(),
    senha: senhaNova.optional(),
  })
  .refine((f) => (f.login === undefined) === (f.senha === undefined), {
    message: "Para dar acesso ao sistema, informe login e senha juntos.",
    path: ["login"],
  });

// Schema de atualização parcial (PATCH).
//   login: "novo"  -> cria/troca o login (exige `senha` se ainda não tiver acesso)
//   login: null    -> remove o acesso ao sistema
//   senha: "nova"  -> o gerente redefine a senha de quem esqueceu
export const atualizarFuncionarioSchema = z.object({
  ...camposBasicos,
  nome: camposBasicos.nome.optional(),
  login: loginDeAcesso.nullable().optional(),
  senha: senhaNova.optional(),
});

export const listarFuncionariosQuerySchema = listarComAtivoQuerySchema.extend({
  // Só quem exerce HOJE o cargo informado (ex.: ?cargo=entregador).
  cargo: z.string().trim().toLowerCase().min(1).max(30).optional(),
});

export type CriarFuncionarioDTO = z.infer<typeof criarFuncionarioSchema>;
export type AtualizarFuncionarioDTO = z.infer<typeof atualizarFuncionarioSchema>;
export type ListarFuncionariosQuery = z.infer<
  typeof listarFuncionariosQuerySchema
>;
