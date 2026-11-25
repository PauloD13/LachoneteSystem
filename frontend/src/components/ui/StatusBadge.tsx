import { classeDoSelo, rotuloDoStatus } from "../../lib/status";
import type { StatusPedido, TipoAtendimento } from "../../types/dominio";

interface Props {
  status: StatusPedido;
  tipo?: TipoAtendimento;
}

/** Selo do status: cor sólida + texto por extenso. Um por pedido. */
export function StatusBadge({ status, tipo }: Props) {
  return (
    <span className={classeDoSelo(status)}>{rotuloDoStatus(status, tipo)}</span>
  );
}
