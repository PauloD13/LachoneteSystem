// Toda listagem de primeiro nível da API é paginada e responde no mesmo
// envelope:
//
//   { "dados": [...], "paginacao": { pagina, tamanhoPagina, total, totalPaginas } }
//
// Sem paginação, uma tabela que cresce (clientes, pedidos) acaba devolvendo
// milhares de linhas em uma única resposta — lenta para o banco, para a rede
// e para o navegador.

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
