import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useConsulta } from "../../hooks/useConsulta";
import { pedidos } from "../../services/pedidos";
import { Paginacao } from "../../components/ui/Paginacao";
import { ErroAoCarregar, Esqueleto, Vazio } from "../../components/ui/Estados";
import { CartaoPedido } from "../../components/pedido/CartaoPedido";
import { Campo } from "../../components/ui/Campo";
import { hojeISO, somarDiasISO } from "../../lib/formatadores";
import estilos from "../atendente/Atendente.module.css";

/** Proposta — Histórico do entregador: entregas concluídas por período. */
export function HistoricoEntregasPage() {
  const { usuario } = useAuth();
  const hoje = hojeISO();
  const [inicio, setInicio] = useState(somarDiasISO(hoje, -6));
  const [fim, setFim] = useState(hoje);
  const [pagina, setPagina] = useState(1);

  const lista = useConsulta(
    `historico:${usuario?.id}:${inicio}:${fim}:${pagina}`,
    (sinal) =>
      pedidos.listar(
        {
          entregadorId: usuario?.id,
          status: "ENTREGUE_RETIRADO",
          dataInicio: inicio,
          dataFim: fim,
          pagina,
          tamanhoPagina: 20,
        },
        sinal,
      ),
  );

  return (
    <>
      <header className={estilos.cabecalho}>
        <h1 className="ui-titulo-pagina">Histórico</h1>
        <div className="ui-form" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Campo rotulo="De">
            <input
              type="date"
              value={inicio}
              max={fim}
              onChange={(e) => {
                setInicio(e.target.value);
                setPagina(1);
              }}
            />
          </Campo>
          <Campo rotulo="Até">
            <input
              type="date"
              value={fim}
              min={inicio}
              max={hoje}
              onChange={(e) => {
                setFim(e.target.value);
                setPagina(1);
              }}
            />
          </Campo>
        </div>
        {lista.dados && (
          <span className="ui-texto-sm ui-suave">
            {lista.dados.paginacao.total}{" "}
            {lista.dados.paginacao.total === 1 ? "entrega" : "entregas"} no
            período
          </span>
        )}
      </header>
      <main className={estilos.conteudo} style={{ gap: 12 }}>
        {lista.erro ? (
          <ErroAoCarregar erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
        ) : !lista.dados ? (
          <Esqueleto linhas={3} altura={96} />
        ) : lista.dados.dados.length === 0 ? (
          <Vazio icone="moto">Nenhuma entrega no período.</Vazio>
        ) : (
          <>
            {lista.dados.dados.map((p) => (
              <CartaoPedido key={p.id} pedido={p} />
            ))}
            <Paginacao paginacao={lista.dados.paginacao} aoMudar={setPagina} />
          </>
        )}
      </main>
    </>
  );
}
