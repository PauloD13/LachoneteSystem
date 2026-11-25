import { z } from "zod";
import {
  dinheiro,
  idNaUrl,
  idNoCorpo,
  listarComAtivoQuerySchema,
} from "./comum.js";

// Categorias do cardápio em que o adicional pode ser oferecido ("bacon extra"
// vale para Lanches, não para Bebidas). Pelo menos uma: um adicional sem
// categoria nunca apareceria para o atendente.
const categoriaIds = z
  .array(idNoCorpo, { error: "Informe a lista categoriaIds." })
  .min(1, "Informe pelo menos uma categoria.")
  .max(50)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Categoria repetida na lista.",
  });

export const criarAdicionalSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(50, "O nome deve ter no máximo 50 caracteres."),
  preco: dinheiro,
  // false = fora do cardápio (não entra em pedidos novos), sem perder o
  // histórico dos pedidos em que já foi usado.
  ativo: z.boolean().optional(),
  categoriaIds,
});

// No PATCH, categoriaIds (se vier) SUBSTITUI a lista inteira.
export const atualizarAdicionalSchema = criarAdicionalSchema.partial();

// ?categoriaId= : adicionais oferecidos numa categoria.
// ?itemVendavelId= : adicionais que podem ir num item (produto ou combo) —
// é o que a tela de pedido usa para montar a lista de extras.
export const listarAdicionaisQuerySchema = listarComAtivoQuerySchema.extend({
  categoriaId: idNaUrl.optional(),
  itemVendavelId: idNaUrl.optional(),
});

export type CriarAdicionalDTO = z.infer<typeof criarAdicionalSchema>;
export type AtualizarAdicionalDTO = z.infer<typeof atualizarAdicionalSchema>;
export type ListarAdicionaisQuery = z.infer<typeof listarAdicionaisQuerySchema>;
