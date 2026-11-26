// Toda listagem de primeiro nível é paginada, para tabelas que crescem
// (clientes, pedidos) não devolverem milhares de linhas de uma vez:
//   { "dados": [...], "paginacao": { pagina, tamanhoPagina, total, totalPaginas } }

export interface Pagina {
  pagina: number;
  tamanhoPagina: number;
}

/** Traduz "página N de tamanho T" para os argumentos skip/take do Prisma. */
export function recorte({ pagina, tamanhoPagina }: Pagina) {
  return { skip: (pagina - 1) * tamanhoPagina, take: tamanhoPagina };
}

export function paginar<T>(dados: T[], total: number, pagina: Pagina) {
  return {
    dados,
    paginacao: {
      pagina: pagina.pagina,
      tamanhoPagina: pagina.tamanhoPagina,
      total,
      totalPaginas: Math.ceil(total / pagina.tamanhoPagina),
    },
  };
}
