import { z } from "zod";
import { INT4_MAX } from "./comum.js";

export const criarMesaSchema = z.object({
  numero: z
    .number({ error: "O número da mesa é obrigatório." })
    .int()
    .positive("O número da mesa deve ser um inteiro positivo.")
    .max(INT4_MAX),
  ativa: z.boolean().optional(),
});

export const atualizarMesaSchema = criarMesaSchema.partial();

export type CriarMesaDTO = z.infer<typeof criarMesaSchema>;
export type AtualizarMesaDTO = z.infer<typeof atualizarMesaSchema>;
