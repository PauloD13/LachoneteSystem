import { z } from "zod";
import { dia, idNaUrl, idNoCorpo } from "./comum.js";

// Parâmetro de URL usado em POST / e GET / (só precisa do funcionarioId,
// que vem do router pai via mergeParams).
export const funcionarioIdParamSchema = z.object({
  funcionarioId: idNaUrl,
});

// Parâmetro de URL usado em PATCH /:vinculoId (precisa dos dois ids: o do
// funcionário, vindo do pai, e o do próprio vínculo).
export const vinculoParamSchema = funcionarioIdParamSchema.extend({
  vinculoId: idNaUrl,
});

// Corpo da requisição ao abrir um vínculo. Não existe "dataFim" aqui de
// propósito — todo vínculo nasce aberto.
//
// As datas são DIAS (AAAA-MM-DD), como as colunas DATE do banco. Quando
// omitidas, o service usa "hoje" no fuso do negócio — e não `new Date()`,
// que depois das 21h de Brasília já cairia no dia seguinte (UTC).
export const abrirVinculoSchema = z.object({
  cargoId: idNoCorpo,
  dataInicio: dia.optional(),
});

// Corpo da requisição ao encerrar um vínculo (pode vir vazio).
export const encerrarVinculoSchema = z.object({
  dataFim: dia.optional(),
});

export type AbrirVinculoDTO = z.infer<typeof abrirVinculoSchema>;
export type EncerrarVinculoDTO = z.infer<typeof encerrarVinculoSchema>;
