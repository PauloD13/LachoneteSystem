import { useCallback, useState } from "react";
import { itemAtual } from "../lib/selecao";

/**
 * Item selecionado numa lista com editor ao lado (cardápio, equipe).
 * Depois de salvar, o editor continua no registro salvo enquanto a lista
 * recarrega — antes, nesse intervalo, caía no primeiro da lista, e quem
 * agisse rápido mexia no registro errado. Ver lib/selecao.ts.
 */
export function useSelecaoNaLista<T extends { id: number }>(
  lista: T[] | undefined,
  carregando: boolean,
) {
  const [id, setId] = useState<number | null>(null);
  const [salvo, setSalvo] = useState<T | null>(null);

  const selecionar = useCallback((novo: number) => setId(novo), []);
  const aposSalvar = useCallback((item: T) => {
    setSalvo(item);
    setId(item.id);
  }, []);

  return {
    atual: itemAtual(lista, id, salvo, carregando),
    selecionar,
    aposSalvar,
  };
}
