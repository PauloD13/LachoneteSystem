import { z } from "zod";

// Limites físicos das colunas do banco. Validar aqui evita que um valor fora
// da faixa chegue ao Postgres e volte como erro 500.
export const INT4_MAX = 2_147_483_647;
const DECIMAL_10_2_MAX = 99_999_999.99;
const DECIMAL_10_3_MAX = 9_999_999.999;

/** Id vindo da URL ou da query string (chega como texto). */
export const idNaUrl = z.coerce
  .number()
  .int()
  .positive("O ID deve ser um número inteiro positivo.")
  .max(INT4_MAX);

/** Id vindo do corpo JSON (precisa ser número de verdade). */
export const idNoCorpo = z
  .number({ error: "Informe um ID numérico." })
  .int()
  .positive("O ID deve ser um número inteiro positivo.")
  .max(INT4_MAX);

export const idParamSchema = z.object({ id: idNaUrl });

/** Valor monetário: DECIMAL(10,2) não negativo. */
export const dinheiro = z
  .number({ error: "Informe um valor numérico." })
  .nonnegative("O valor não pode ser negativo.")
  .max(DECIMAL_10_2_MAX)
  .multipleOf(0.01, "Use no máximo 2 casas decimais.");

/** Quantidade de estoque/ficha técnica: DECIMAL(10,3) não negativo. */
export const quantidadeDecimal = z
  .number({ error: "Informe uma quantidade numérica." })
  .nonnegative("A quantidade não pode ser negativa.")
  .max(DECIMAL_10_3_MAX)
  .multipleOf(0.001, "Use no máximo 3 casas decimais.");

/** Dia no formato AAAA-MM-DD, convertido para Date à meia-noite UTC. */
export const dia = z.iso
  .date("Use o formato AAAA-MM-DD.")
  .transform((valor) => new Date(`${valor}T00:00:00Z`));

export const tipoDesconto = z.enum(["VALOR", "PERCENTUAL"], {
  error: "tipoDesconto deve ser VALOR ou PERCENTUAL.",
});

// Query string padrão das listagens: ?pagina=1&tamanhoPagina=20
// (o teto de 100 impede que alguém peça a tabela inteira de uma vez).
export const paginacaoQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).max(INT4_MAX).default(1),
  tamanhoPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginacaoQuery = z.infer<typeof paginacaoQuerySchema>;

/** Booleano vindo da query string (?ativo=true). */
export const booleanoNaUrl = z
  .enum(["true", "false"], { error: "Use true ou false." })
  .transform((valor) => valor === "true");

/** Listagens de cadastros que podem ser desativados: ?ativo=true|false. */
export const listarComAtivoQuerySchema = paginacaoQuerySchema.extend({
  ativo: booleanoNaUrl.optional(),
});

export type ListarComAtivoQuery = z.infer<typeof listarComAtivoQuerySchema>;
