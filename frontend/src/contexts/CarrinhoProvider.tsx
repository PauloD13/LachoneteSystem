import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CARRINHO_VAZIO,
  CarrinhoContexto,
  novaChave,
  precoUnitario,
  type Carrinho,
  type ItemDoCarrinho,
  type ValorDoCarrinho,
} from "./carrinho-contexto";

// O pedido em montagem sobrevive a recarregar a página (sessionStorage:
// some ao fechar a aba, e cada aba tem o seu).
const CHAVE = "lsc.carrinho";

function ler(): Carrinho {
  try {
    const texto = sessionStorage.getItem(CHAVE);
    return texto
      ? { ...CARRINHO_VAZIO, ...(JSON.parse(texto) as Carrinho) }
      : CARRINHO_VAZIO;
  } catch {
    return CARRINHO_VAZIO;
  }
}

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [carrinho, setCarrinho] = useState<Carrinho>(ler);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(carrinho));
    } catch {
      // sem armazenamento: o carrinho dura enquanto a página estiver aberta
    }
  }, [carrinho]);

  const alterar = useCallback(
    (parcial: Partial<Carrinho>) => setCarrinho((c) => ({ ...c, ...parcial })),
    [],
  );

  const adicionar = useCallback((item: Omit<ItemDoCarrinho, "chave">) => {
    setCarrinho((c) => {
      // Mesmo item, mesmas escolhas: soma na linha que já existe.
      const igual = c.itens.find(
        (i) =>
          i.itemVendavelId === item.itemVendavelId &&
          i.variacao?.id === item.variacao?.id &&
          i.observacao === item.observacao &&
          i.adicionais.map((a) => a.id).join() ===
            item.adicionais.map((a) => a.id).join(),
      );
      if (igual) {
        return {
          ...c,
          itens: c.itens.map((i) =>
            i === igual
              ? { ...i, quantidade: i.quantidade + item.quantidade }
              : i,
          ),
        };
      }
      return { ...c, itens: [...c.itens, { ...item, chave: novaChave() }] };
    });
  }, []);

  const atualizarItem = useCallback(
    (chave: string, parcial: Partial<ItemDoCarrinho>) => {
      setCarrinho((c) => ({
        ...c,
        itens: c.itens.map((i) =>
          i.chave === chave ? { ...i, ...parcial } : i,
        ),
      }));
    },
    [],
  );

  const removerItem = useCallback((chave: string) => {
    setCarrinho((c) => ({
      ...c,
      itens: c.itens.filter((i) => i.chave !== chave),
    }));
  }, []);

  const limpar = useCallback(() => setCarrinho(CARRINHO_VAZIO), []);

  const valor = useMemo<ValorDoCarrinho>(
    () => ({
      carrinho,
      quantidadeTotal: carrinho.itens.reduce((n, i) => n + i.quantidade, 0),
      subtotalEstimado: carrinho.itens.reduce(
        (soma, i) => soma + precoUnitario(i) * i.quantidade,
        0,
      ),
      alterar,
      adicionar,
      atualizarItem,
      removerItem,
      limpar,
    }),
    [carrinho, alterar, adicionar, atualizarItem, removerItem, limpar],
  );

  return (
    <CarrinhoContexto.Provider value={valor}>
      {children}
    </CarrinhoContexto.Provider>
  );
}
