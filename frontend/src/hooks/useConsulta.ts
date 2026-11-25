import { useCallback, useEffect, useRef, useState } from "react";

interface Resultado<T> {
  chave: string;
  dados?: T;
  erro?: unknown;
}

export interface EstadoDaConsulta<T> {
  /** Último resultado recebido (continua visível enquanto recarrega). */
  dados: T | undefined;
  carregando: boolean;
  erro: unknown;
  /** Busca de novo (ex.: depois de salvar ou excluir um registro). */
  recarregar(): void;
}

/**
 * Carrega dados da API para uma tela, cuidando de "carregando", erro e
 * cancelamento. Substitui o par useState + useEffect que toda tela de
 * listagem repetiria.
 *
 * `chave` identifica O QUE está sendo buscado: quando ela muda (outra
 * página, outro filtro), a busca é refeita e a anterior é cancelada.
 *
 *   const { dados, carregando, erro, recarregar } = useConsulta(
 *     `clientes:${pagina}:${busca}`,
 *     (sinal) => clientes.listar({ pagina, busca }, sinal),
 *   );
 */
export function useConsulta<T>(
  chave: string,
  buscar: (sinal: AbortSignal) => Promise<T>,
): EstadoDaConsulta<T> {
  const [versao, setVersao] = useState(0);
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);
  const chaveAtual = `${chave}#${versao}`;

  // Guarda sempre a versão mais nova da função `buscar`, sem que a busca
  // seja refeita a cada renderização (a função é recriada em todas).
  const buscarAtual = useRef(buscar);
  useEffect(() => {
    buscarAtual.current = buscar;
  });

  useEffect(() => {
    const controle = new AbortController();
    buscarAtual.current(controle.signal).then(
      (dados) => {
        if (!controle.signal.aborted)
          setResultado({ chave: chaveAtual, dados });
      },
      (erro: unknown) => {
        if (!controle.signal.aborted) setResultado({ chave: chaveAtual, erro });
      },
    );
    // Trocou de página/filtro (ou saiu da tela) antes da resposta: cancela,
    // para uma resposta atrasada não sobrescrever a mais nova.
    return () => controle.abort();
  }, [chaveAtual]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const carregando = resultado?.chave !== chaveAtual;

  return {
    dados: resultado?.dados,
    carregando,
    erro: carregando ? undefined : resultado?.erro,
    recarregar,
  };
}
