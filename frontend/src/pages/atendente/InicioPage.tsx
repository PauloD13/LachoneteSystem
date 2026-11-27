import { Link } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { useConsulta } from "../../hooks/useConsulta";
import { usePeriodico } from "../../hooks/usePeriodico";
import { useAoVivo } from "../../hooks/useAoVivo";
import { pedidos } from "../../services/pedidos";
import { Icone } from "../../components/ui/Icone";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ErroAoCarregar, Esqueleto, Vazio } from "../../components/ui/Estados";
import { itensEmTexto, ondeDoPedido } from "../../components/pedido/resumo";
import {
  hojeISO,
  hojePorExtenso,
  inicial,
  numeroPedido,
  primeiroNome,
  saudacao,
} from "../../lib/formatadores";
import { STATUS_EM_ABERTO } from "../../lib/status";
import estilos from "./Atendente.module.css";

/** Tela 2 — Início do atendente: o turno num relance. */
export function InicioPage() {
  const { usuario } = useAuth();
  const hoje = hojeISO();

  const abertos = useConsulta("inicio:abertos", (sinal) =>
    pedidos.listar(
      { status: STATUS_EM_ABERTO, ordem: "antigos", tamanhoPagina: 100 },
      sinal,
    ),
  );
  const atendidos = useConsulta(`inicio:atendidos:${hoje}`, (sinal) =>
    pedidos.listar(
      { status: "ENTREGUE_RETIRADO", dataInicio: hoje, tamanhoPagina: 1 },
      sinal,
    ),
  );
  const recarregar = () => {
    abertos.recarregar();
    atendidos.recarregar();
  };
  const aoVivo = useAoVivo(recarregar);
  usePeriodico(recarregar, aoVivo ? 120000 : 20000);

  const lista = abertos.dados?.dados ?? [];
  const prontos = lista.filter((p) => p.statusAtual === "PRONTO");
  const naCozinha = lista.filter(
    (p) => p.statusAtual === "RECEBIDO" || p.statusAtual === "EM_PREPARO",
  );

  const numeros = [
    { valor: abertos.dados?.paginacao.total, rotulo: "em aberto" },
    { valor: prontos.length, rotulo: "prontos" },
    { valor: atendidos.dados?.paginacao.total, rotulo: "atendidos hoje" },
  ];

  return (
    <>
      <header className={estilos.cabecalho}>
        <div className="ui-linha ui-linha--entre">
          <div className="ui-coluna" style={{ gap: 0 }}>
            <span className="ui-texto-sm ui-suave">{hojePorExtenso()}</span>
            <h1 className="ui-titulo-pagina">
              {saudacao()}, {primeiroNome(usuario?.nome)}!
            </h1>
          </div>
          <Link to="/mais" className="ui-avatar" aria-label="Perfil e ajustes">
            {inicial(usuario?.nome)}
          </Link>
        </div>
      </header>

      <main className={estilos.conteudo}>
        <Link
          to="/pedidos/novo"
          className="sc-btn sc-btn--primary sc-btn--lg sc-btn--block"
        >
          <Icone nome="mais" tamanho={22} traco={2.4} />
          Novo pedido
        </Link>

        <section aria-label="Resumo do turno" className="ui-numeros">
          {numeros.map((n) => (
            <div
              key={n.rotulo}
              className="ui-numero"
              style={{
                background: "var(--surface-200)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="ui-numero__valor">{n.valor ?? "–"}</div>
              <div className="ui-numero__rotulo">{n.rotulo}</div>
            </div>
          ))}
        </section>

        {abertos.erro ? (
          <ErroAoCarregar
            erro={abertos.erro}
            aoTentarDeNovo={abertos.recarregar}
          />
        ) : !abertos.dados ? (
          <Esqueleto linhas={3} />
        ) : (
          <>
            <section aria-labelledby="h-prontos" className="ui-coluna">
              <div className="ui-linha ui-linha--entre">
                <h2 id="h-prontos" className="ui-titulo-secao">
                  Prontos para entregar
                </h2>
                <Link to="/pedidos" className="ui-link">
                  Ver todos
                </Link>
              </div>
              {prontos.length === 0 ? (
                <p className="ui-texto-sm ui-suave">
                  Nenhum pedido esperando no balcão.
                </p>
              ) : (
                prontos.map((p) => (
                  <Link
                    key={p.id}
                    to={`/pedidos/${p.id}`}
                    className={`sc-ticket sc-ticket--pronto ${estilos.pronto}`}
                  >
                    <span className="ui-numero-pedido">
                      {numeroPedido(p.id)}
                    </span>
                    <span className={estilos.prontoTexto}>
                      <span style={{ font: "800 15px/20px var(--font-sans)" }}>
                        {ondeDoPedido(p)}
                        {p.cliente ? ` · ${primeiroNome(p.cliente.nome)}` : ""}
                      </span>
                      <span
                        className={`ui-texto-sm ui-suave ${estilos.reticencias}`}
                      >
                        {itensEmTexto(p)}
                      </span>
                    </span>
                    <StatusBadge status={p.statusAtual} />
                  </Link>
                ))
              )}
            </section>

            <section aria-labelledby="h-cozinha" className="ui-coluna">
              <h2 id="h-cozinha" className="ui-titulo-secao">
                Na cozinha
              </h2>
              {naCozinha.length === 0 ? (
                <Vazio icone="panela">Cozinha sem fila agora.</Vazio>
              ) : (
                <div className="ui-cartao" style={{ gap: 4, padding: 8 }}>
                  {naCozinha.map((p) => (
                    <Link
                      key={p.id}
                      to={`/pedidos/${p.id}`}
                      className={estilos.linhaCozinha}
                    >
                      <span
                        className="ui-numero-pedido"
                        style={{ fontSize: 17, width: 64 }}
                      >
                        {numeroPedido(p.id)}
                      </span>
                      <span
                        className="ui-texto-sm ui-suave"
                        style={{ flex: 1 }}
                      >
                        {ondeDoPedido(p)}
                      </span>
                      <StatusBadge status={p.statusAtual} />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
