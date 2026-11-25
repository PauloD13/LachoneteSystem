// Tipos "de infraestrutura": como a API embrulha as respostas.

/**
 * Valor em dinheiro como a API devolve: TEXTO, não número (ex.: "10" ou
 * "27.50"). É de propósito — o backend usa Decimal para não perder
 * centavos em contas como 0.1 + 0.2. Para exibir, use `moeda()` de
 * lib/formatadores; para fazer conta, `paraNumero()`.
 */
export type Dinheiro = string;

/** Quantidade com casas decimais (estoque, ficha técnica), também texto. */
export type Decimal = string;

/** Instante exato em ISO 8601 UTC (ex.: "2026-11-25T11:44:40.988Z"). */
export type Instante = string;

/**
 * Dia de calendário (validade de promoção, início de um cargo). Chega como
 * meia-noite UTC (ex.: "2027-01-04T00:00:00.000Z"). NUNCA passe por
 * `new Date(...).toLocaleDateString()`: no fuso do Brasil isso vira o dia
 * anterior. Use `dia()` de lib/formatadores.
 */
export type Dia = string;

/** Envelope de toda listagem de primeiro nível da API. */
export interface Paginado<T> {
  dados: T[];
  paginacao: {
    pagina: number;
    tamanhoPagina: number;
    total: number;
    totalPaginas: number;
  };
}

/**
 * Parâmetros comuns das listagens paginadas (?pagina=1&tamanhoPagina=20).
 * É `type` (e não `interface`) para poder ser combinado com `&` e usado como
 * query string: interfaces não são aceitas onde se espera um Record.
 */
export type ConsultaPaginada = {
  pagina?: number;
  tamanhoPagina?: number;
};

/** Corpo das respostas de erro da API. */
export interface CorpoDeErro {
  error: string;
  /** Erros de validação por campo (só em respostas 400). */
  details?: Record<string, string[] | undefined>;
  /** Id para achar o erro no log do servidor (só em respostas 500). */
  requestId?: string;
}
