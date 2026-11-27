import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  assinarPedidos,
  estaConectado,
  observarConexao,
  type EventoDePedido,
} from "../services/eventos";

/**
 * Chama `aoMudar` quando algum pedido muda em outro aparelho (criado, novo
 * status, pagamento, entregador, avaliação). Rajadas de eventos viram uma
 * chamada só (250 ms). `filtro` escolhe quais eventos interessam.
 *
 * Devolve se a conexão em tempo real está aberta: as telas usam isso para
 * consultar a API com menos frequência enquanto ela funciona.
 */
export function useAoVivo(
  aoMudar: () => void,
  filtro?: (evento: EventoDePedido) => boolean,
): boolean {
  const atual = useRef({ aoMudar, filtro });
  useEffect(() => {
    atual.current = { aoMudar, filtro };
  });

  useEffect(() => {
    let espera: ReturnType<typeof setTimeout> | undefined;
    const parar = assinarPedidos((evento) => {
      if (atual.current.filtro && !atual.current.filtro(evento)) return;
      clearTimeout(espera);
      espera = setTimeout(() => atual.current.aoMudar(), 250);
    });
    return () => {
      parar();
      clearTimeout(espera);
    };
  }, []);

  return useSyncExternalStore(observarConexao, estaConectado);
}
