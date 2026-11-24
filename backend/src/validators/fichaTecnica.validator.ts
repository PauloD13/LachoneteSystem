import { z } from "zod";
import { idNaUrl, quantidadeDecimal } from "./comum.js";

export const produtoIdParamSchema = z.object({ produtoId: idNaUrl });

export const fichaTecnicaParamSchema = produtoIdParamSchema.extend({
  ingredienteId: idNaUrl,
});

export const definirIngredienteSchema = z.object({
  // Quanto do ingrediente uma unidade do produto consome, na unidade de
  // medida do próprio ingrediente.
  quantidadeUtilizada: quantidadeDecimal.positive(
    "A quantidade utilizada deve ser maior que zero.",
  ),
});

export type DefinirIngredienteDTO = z.infer<typeof definirIngredienteSchema>;
