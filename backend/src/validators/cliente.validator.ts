import { z } from "zod";

// Validação do parâmetro :id da rota
// Se o seu ID no Prisma for String/UUID, troque por: z.string().uuid('ID inválido')
export const clienteIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive("O ID deve ser um número inteiro positivo."),
});

// Schema de criação (POST)
export const criarClienteSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
  telefone: z
    .string({ error: "O telefone é obrigatório." })
    .trim()
    .min(8, "Informe um telefone válido.")
    .max(20, "O telefone deve ter no máximo 20 caracteres."),
  email: z
    .string()
    .trim()
    .email("Formato de e-mail inválido.")
    .max(100)
    .nullish(),

  // Campos de endereço opcionais — nomes alinhados ao model Cliente do
  // schema.prisma / database/init/001_schema.sql. "complemento" e "estado"
  // não existem na tabela cliente (fora do escopo levantado nas regras de
  // negócio e do dicionário de dados), por isso não entram aqui.
  enderecoPadraoLogradouro: z.string().trim().max(150).nullish(),
  enderecoPadraoNumero: z.string().trim().max(10).nullish(),
  enderecoPadraoBairro: z.string().trim().max(100).nullish(),
  enderecoPadraoCidade: z.string().trim().max(100).nullish(),
  enderecoPadraoCep: z.string().trim().max(9).nullish(),
});

// Schema de atualização parcial (PATCH) — torna todos os campos opcionais
export const atualizarClienteSchema = criarClienteSchema.partial();

export type CriarClienteDTO = z.infer<typeof criarClienteSchema>;
export type AtualizarClienteDTO = z.infer<typeof atualizarClienteSchema>;
