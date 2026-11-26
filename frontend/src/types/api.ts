// Como a API embrulha as respostas.

/**
 * Dinheiro chega como texto ("27.50"): o backend usa Decimal para não perder
 * centavos. Exiba com `moeda()` e faça conta com `paraNumero()`.
 */
export type Dinheiro = string;

/** Quantidade com casas decimais (estoque, ficha técnica), também texto. */
export type Decimal = string;

/** Instante exato em ISO 8601 UTC (ex.: "2026-11-25T11:44:40.988Z"). */
export type Instante = string;

/**
 * Dia de calendário, como meia-noite UTC ("2027-01-04T00:00:00.000Z"). Use
 * `dia()` de lib/formatadores: `toLocaleDateString()` mostraria o dia
 * anterior no fuso do Brasil.
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

/** `type`, e não `interface`, para caber onde se espera um Record (query string). */
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
