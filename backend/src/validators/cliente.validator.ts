import { z } from "zod";
import { paginacaoQuerySchema } from "./comum.js";

// Schema de criação (POST). Os limites acompanham as colunas da tabela
// cliente (nome e email são VARCHAR(150)).
export const criarClienteSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(150, "O nome deve ter no máximo 150 caracteres."),
  telefone: z
    .string({ error: "O telefone é obrigatório." })
    .trim()
    .min(8, "Informe um telefone válido.")
    .max(20, "O telefone deve ter no máximo 20 caracteres."),
  email: z
    .string()
    .trim()
    .email("Formato de e-mail inválido.")
    .max(150)
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

// Com a lista paginada, o atendente precisa de um jeito de achar o cliente
// sem folhear páginas: ?busca= procura no nome, no telefone e no e-mail.
export const listarClientesQuerySchema = paginacaoQuerySchema.extend({
  busca: z.string().trim().min(1).max(100).optional(),
});

export type CriarClienteDTO = z.infer<typeof criarClienteSchema>;
export type AtualizarClienteDTO = z.infer<typeof atualizarClienteSchema>;
export type ListarClientesQuery = z.infer<typeof listarClientesQuerySchema>;
