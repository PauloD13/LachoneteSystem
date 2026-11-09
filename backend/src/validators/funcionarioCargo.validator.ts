import { z } from "zod";

// Parâmetro de URL usado em POST / e GET / (só precisa do funcionarioId,
// que vem do router pai via mergeParams).
export const funcionarioIdParamSchema = z.object({
  funcionarioId: z.coerce.number().int().positive(),
});

// Parâmetro de URL usado em PATCH /:vinculoId (precisa dos dois ids: o do
// funcionário, vindo do pai, e o do próprio vínculo).
export const vinculoParamSchema = funcionarioIdParamSchema.extend({
  vinculoId: z.coerce.number().int().positive(),
});

// Corpo da requisição ao abrir um vínculo. Não existe "dataFim" aqui de
// propósito — todo vínculo nasce aberto.
export const abrirVinculoSchema = z.object({
  cargoId: z.coerce
    .number({ error: "cargoId é obrigatório." })
    .int()
    .positive("cargoId deve ser um número inteiro positivo."),
  dataInicio: z.coerce.date().default(() => new Date()),
});

// Corpo da requisição ao encerrar um vínculo.
export const encerrarVinculoSchema = z.object({
  dataFim: z.coerce.date().default(() => new Date()),
});

export type AbrirVinculoDTO = z.infer<typeof abrirVinculoSchema>;
export type EncerrarVinculoDTO = z.infer<typeof encerrarVinculoSchema>;
