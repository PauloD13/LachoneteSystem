import { z } from "zod";

// Formato de um login NOVO (cadastro de funcionário).
export const loginDeAcesso = z
  .string({ error: "Informe o login." })
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9._-]{3,50}$/,
    "O login deve ter de 3 a 50 caracteres: letras, números, ponto, hífen ou sublinhado.",
  );

// Formato de uma senha NOVA. O limite superior existe porque o custo do hash
// cresce com o tamanho da entrada: sem teto, uma "senha" de megabytes viraria
// um jeito de derrubar o servidor.
export const senhaNova = z
  .string({ error: "Informe a senha." })
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.");

// No login não se valida formato: qualquer coisa errada vira o mesmo
// "login ou senha inválidos", sem dar pistas.
export const loginSchema = z.object({
  login: z.string({ error: "Informe o login." }).trim().toLowerCase().min(1).max(50),
  senha: z.string({ error: "Informe a senha." }).min(1).max(128),
});

export const trocarSenhaSchema = z.object({
  senhaAtual: z.string({ error: "Informe a senha atual." }).min(1).max(128),
  novaSenha: senhaNova,
});

export type LoginDTO = z.infer<typeof loginSchema>;
export type TrocarSenhaDTO = z.infer<typeof trocarSenhaSchema>;
