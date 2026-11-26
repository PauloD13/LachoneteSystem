import { z } from "zod";
import { dia, idNaUrl, idNoCorpo } from "./comum.js";

// funcionarioId vem do router pai (mergeParams).
export const funcionarioIdParamSchema = z.object({
  funcionarioId: idNaUrl,
});

export const vinculoParamSchema = funcionarioIdParamSchema.extend({
  vinculoId: idNaUrl,
});

// Sem dataFim: todo vínculo nasce aberto. Datas são dias (AAAA-MM-DD); sem
// elas, o service usa "hoje" no fuso do negócio (não `new Date()`, que após
// as 21h de Brasília já é amanhã em UTC).
export const abrirVinculoSchema = z.object({
  cargoId: idNoCorpo,
  dataInicio: dia.optional(),
});

export const encerrarVinculoSchema = z.object({
  dataFim: dia.optional(),
});

export type AbrirVinculoDTO = z.infer<typeof abrirVinculoSchema>;
export type EncerrarVinculoDTO = z.infer<typeof encerrarVinculoSchema>;
