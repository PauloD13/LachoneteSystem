import { z } from "zod";
import { dinheiro, idNoCorpo } from "./comum.js";

const itemDoComboSchema = z.object({
  produtoId: idNoCorpo,
  quantidade: z.number().int().positive().max(1000).default(1),
});

// Regra de negócio 4.2: "um combo reúne dois ou mais produtos".
const itensDoComboSchema = z
  .array(itemDoComboSchema)
  .min(1, "Informe os produtos do combo.")
  .max(50)
  .refine(
    (itens) => new Set(itens.map((i) => i.produtoId)).size === itens.length,
    "Há produto repetido no combo; use o campo quantidade.",
  )
  .refine(
    (itens) => itens.reduce((soma, i) => soma + i.quantidade, 0) >= 2,
    "Um combo precisa reunir pelo menos dois produtos.",
  );

export const criarComboSchema = z.object({
  nome: z
    .string({ error: "O nome é obrigatório." })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(150, "O nome deve ter no máximo 150 caracteres."),
  preco: dinheiro.positive("O preço deve ser maior que zero."),
  descricao: z.string().trim().max(1000).nullish(),
  // false = fora do cardápio, sem perder o histórico de vendas.
  ativo: z.boolean().optional(),
  itens: itensDoComboSchema,
});

// No PATCH, "itens" (se enviado) substitui a composição inteira do combo.
export const atualizarComboSchema = criarComboSchema.partial();

export type CriarComboDTO = z.infer<typeof criarComboSchema>;
export type AtualizarComboDTO = z.infer<typeof atualizarComboSchema>;
