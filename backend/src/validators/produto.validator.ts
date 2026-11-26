import { z } from "zod";
import {
  dinheiro,
  idNaUrl,
  idNoCorpo,
  listarComAtivoQuerySchema,
} from "./comum.js";

// nome, preco e ativo vão para item_vendavel (supertipo); categoriaId e
// descricao, para produto (subtipo). Quem separa é o service.
export const criarProdutoSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(150, "O nome deve ter no máximo 150 caracteres."),
  // `dinheiro` limita ao que a coluna DECIMAL(10,2) comporta e recusa mais
  // de 2 casas decimais (10.999 não é arredondado em silêncio: é erro).
  preco: dinheiro.positive("O preço deve ser maior que zero."),
  categoriaId: idNoCorpo,
  descricao: z.string().trim().max(1000).nullish(),
  // false = fora do cardápio (não entra em pedidos novos), sem perder o
  // histórico dos pedidos em que já foi vendido.
  ativo: z.boolean().optional(),
});

export const atualizarProdutoSchema = criarProdutoSchema.partial();

export const listarProdutosQuerySchema = listarComAtivoQuerySchema.extend({
  categoriaId: idNaUrl.optional(),
  // Parte do nome, sem diferenciar maiúsculas.
  busca: z.string().trim().min(1).max(100).optional(),
});

export type CriarProdutoDTO = z.infer<typeof criarProdutoSchema>;
export type AtualizarProdutoDTO = z.infer<typeof atualizarProdutoSchema>;
export type ListarProdutosQuery = z.infer<typeof listarProdutosQuerySchema>;
