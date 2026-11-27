import { useState } from "react";
import { Link } from "react-router";
import { useConsulta } from "../../hooks/useConsulta";
import { usePeriodico } from "../../hooks/usePeriodico";
import { useAoVivo } from "../../hooks/useAoVivo";
import { mesas } from "../../services/cadastros";
import { Chip } from "../../components/ui/Chip";
import { ErroAoCarregar, Esqueleto, Vazio } from "../../components/ui/Estados";
import { classeDaComanda, rotuloDoStatus } from "../../lib/status";
import { haQuantoTempo, moeda, paraNumero } from "../../lib/formatadores";
import estilos from "./Atendente.module.css";

type Filtro = "todas" | "ocupadas" | "livres";

/** Tela 10 — Mesas: ocupadas com a listra do status; livres abrem pedido. */
export function MesasPage() {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const lista = useConsulta("mesas", (sinal) =>
    mesas.listar({ ativa: true, tamanhoPagina: 100 }, sinal),
  );
  const aoVivo = useAoVivo(lista.recarregar);
  usePeriodico(lista.recarregar, aoVivo ? 120000 : 20000);

  const todas = lista.dados?.dados ?? [];
  const ocupadas = todas.filter((m) => m.pedidoAberto);
  const visiveis =
    filtro === "ocupadas"
      ? ocupadas
      : filtro === "livres"
        ? todas.filter((m) => !m.pedidoAberto)
        : todas;

  return (
    <>
      <header className={estilos.cabecalho} style={{ gap: 12 }}>
        <div className="ui-coluna" style={{ gap: 0 }}>
          <span className="ui-texto-sm ui-suave">
            {lista.dados
              ? `Salão · ${ocupadas.length} de ${todas.length} ocupadas`
              : "Salão"}
          </span>
          <h1 className="ui-titulo-pagina">Mesas</h1>
        </div>
        <div className="ui-faixa" role="group" aria-label="Filtrar mesas">
          <Chip
            selecionado={filtro === "todas"}
            onClick={() => setFiltro("todas")}
          >
            Todas
          </Chip>
          <Chip
            selecionado={filtro === "ocupadas"}
            onClick={() => setFiltro("ocupadas")}
          >
            Ocupadas
          </Chip>
          <Chip
            selecionado={filtro === "livres"}
            onClick={() => setFiltro("livres")}
          >
            Livres
          </Chip>
        </div>
      </header>
      <main className={estilos.conteudo}>
        {lista.erro ? (
          <ErroAoCarregar erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
        ) : !lista.dados ? (
          <Esqueleto linhas={3} altura={108} />
        ) : visiveis.length === 0 ? (
          <Vazio icone="mesa">
            {todas.length === 0
              ? "Nenhuma mesa ativa. O gerente cadastra as mesas em Ajustes."
              : "Nenhuma mesa aqui."}
          </Vazio>
        ) : (
          <div className={estilos.gradeMesas}>
            {visiveis.map((m) => {
              const p = m.pedidoAberto;
              if (!p) {
                return (
                  <Link
                    key={m.id}
                    to={`/pedidos/novo?mesa=${m.id}`}
                    className={`sc-ticket ${estilos.mesa} ${estilos.mesaLivre}`}
                    aria-label={`Mesa ${m.numero}, livre. Abrir pedido`}
                  >
                    <span style={{ font: "600 24px/28px var(--font-display)" }}>
                      {m.numero}
                    </span>
                    <span
                      className="ui-suave"
                      style={{ font: "800 14px/18px var(--font-sans)" }}
                    >
                      Livre
                    </span>
                    <span
                      className="ui-suave"
                      style={{
                        marginTop: "auto",
                        font: "700 13px/18px var(--font-sans)",
                      }}
                    >
                      + abrir pedido
                    </span>
                  </Link>
                );
              }
              const saldo = paraNumero(p.saldo);
              return (
                <Link
                  key={m.id}
                  to={`/pedidos/${p.id}`}
                  className={`${classeDaComanda(p.statusAtual)} ${estilos.mesa}`}
                  aria-label={`Mesa ${m.numero}, ${rotuloDoStatus(p.statusAtual, "CONSUMO_LOCAL")}`}
                >
                  <span style={{ font: "600 24px/28px var(--font-display)" }}>
                    {m.numero}
                  </span>
                  <span style={{ font: "800 14px/18px var(--font-sans)" }}>
                    {rotuloDoStatus(p.statusAtual, "CONSUMO_LOCAL")}
                  </span>
                  <span
                    className="sc-tnum ui-suave"
                    style={{
                      marginTop: "auto",
                      font: "700 13px/18px var(--font-sans)",
                    }}
                  >
                    {saldo > 0 ? `a pagar ${moeda(saldo)}` : moeda(p.total)} ·{" "}
                    {haQuantoTempo(p.dataHora)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
        <p className="ui-texto-sm ui-suave">
          A listra mostra o status do pedido da mesa. A mesa fica livre quando o
          pedido é entregue e pago. Toque numa mesa livre para abrir um pedido
          nela.
        </p>
      </main>
    </>
  );
}
