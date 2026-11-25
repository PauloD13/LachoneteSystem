import { Link } from "react-router";
import { StatusBadge } from "../ui/StatusBadge";
import { classeDaComanda } from "../../lib/status";
import { hora, moeda, numeroPedido } from "../../lib/formatadores";
import { itensEmTexto, ondeDoPedido } from "./resumo";
import type { Pedido } from "../../types/dominio";

/** Pedido numa lista: listra do status, número, hora, onde, total e itens. */
export function CartaoPedido({ pedido }: { pedido: Pedido }) {
  return (
    <Link
      to={`/pedidos/${pedido.id}`}
      className={classeDaComanda(pedido.statusAtual)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "12px 16px 14px",
      }}
    >
      <span className="ui-linha ui-linha--entre">
        <span className="ui-linha" style={{ alignItems: "baseline", gap: 10 }}>
          <span className="ui-numero-pedido">{numeroPedido(pedido.id)}</span>
          <span
            className="sc-tnum ui-suave"
            style={{ font: "700 14px/20px var(--font-sans)" }}
          >
            {hora(pedido.dataHora)}
          </span>
        </span>
        <StatusBadge
          status={pedido.statusAtual}
          tipo={pedido.tipoAtendimento}
        />
      </span>
      <span className="ui-linha ui-linha--entre">
        <span style={{ font: "700 15px/20px var(--font-sans)" }}>
          {ondeDoPedido(pedido)}
          {pedido.cliente ? ` · ${pedido.cliente.nome}` : ""}
        </span>
        <span className="sc-price" style={{ fontSize: 16 }}>
          {moeda(pedido.totais.total)}
        </span>
      </span>
      <span
        className="ui-suave"
        style={{
          font: "600 13px/18px var(--font-sans)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {itensEmTexto(pedido)}
      </span>
    </Link>
  );
}
