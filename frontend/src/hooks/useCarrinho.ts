import { useContext } from "react";
import {
  CarrinhoContexto,
  type ValorDoCarrinho,
} from "../contexts/carrinho-contexto";

export function useCarrinho(): ValorDoCarrinho {
  const valor = useContext(CarrinhoContexto);
  if (!valor)
    throw new Error("useCarrinho precisa estar dentro de <CarrinhoProvider>.");
  return valor;
}
