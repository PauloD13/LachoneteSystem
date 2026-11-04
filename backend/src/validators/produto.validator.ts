import { z } from "zod";

// Validação do parâmetro :id da rota
export const produtoIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive("O ID deve ser um número inteiro positivo."),
});

// Schema de criação (POST)
// "nome" e "preco" pertencem ao item_vendavel (supertipo); "categoriaId" e
// "descricao" pertencem ao produto (subtipo). O service é quem decide pra
// qual tabela cada campo vai — aqui é só o formato aceito na entrada da API.
export const criarProdutoSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(150, "O nome deve ter no máximo 150 caracteres."),
  preco: z
    .number({ error: "O preço é obrigatório." })
    .positive("O preço deve ser maior que zero."),
  categoriaId: z
    .number({ error: "A categoria é obrigatória." })
    .int()
    .positive("categoriaId deve ser um número inteiro positivo."),
  descricao: z.string().trim().max(1000).nullish(),
});

// Schema de atualização parcial (PATCH)
export const atualizarProdutoSchema = criarProdutoSchema.partial();

export type CriarProdutoDTO = z.infer<typeof criarProdutoSchema>;
export type AtualizarProdutoDTO = z.infer<typeof atualizarProdutoSchema>;
