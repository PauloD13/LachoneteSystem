import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { useAvisos } from "../../hooks/useAvisos";
import { useConsulta } from "../../hooks/useConsulta";
import { usePeriodico } from "../../hooks/usePeriodico";
import { pedidos } from "../../services/pedidos";
import { Botao } from "../../components/ui/Botao";
import { Icone } from "../../components/ui/Icone";
import { ErroAoCarregar, Esqueleto, Vazio } from "../../components/ui/Estados";
import { itensEmTexto } from "../../components/pedido/resumo";
import {
  hojeISO,
  hora,
  minutosDesde,
  moeda,
  numeroPedido,
  paraNumero,
  primeiroNome,
  telefone,
} from "../../lib/formatadores";
import type { Pedido } from "../../types/dominio";
import estilos from "../atendente/Atendente.module.css";

function linkDoMapa(p: Pedido): string {
  const e = p.entrega!.endereco;
  const texto = `${e.logradouro}, ${e.numero}, ${e.bairro}, ${e.cidade}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}`;
}

function cobranca(p: Pedido): string {
  const saldo = paraNumero(p.totais.saldo);
  return saldo > 0 ? `cobrar ${moeda(saldo)}` : "já pago";
}

/** Tela 9 — Minhas entregas (entregador, no celular). */
export function EntregasPage() {
  const { usuario } = useAuth();
  const avisos = useAvisos();
  const [ocupado, setOcupado] = useState<number | null>(null);
  const eu = usuario?.id ?? 0;
  const hoje = hojeISO();

  // Em rota e prontas (minhas ou ainda sem entregador) + entregues hoje.
  const andamento = useConsulta("entregas:andamento", (sinal) =>
    pedidos.listar(
      {
        tipoAtendimento: "ENTREGA",
        status: ["PRONTO", "SAIU_PARA_ENTREGA"],
        ordem: "antigos",
        tamanhoPagina: 100,
      },
      sinal,
    ),
  );
  const feitas = useConsulta(`entregas:feitas:${eu}:${hoje}`, (sinal) =>
    pedidos.listar(
      {
        entregadorId: eu,
        status: "ENTREGUE_RETIRADO",
        dataInicio: hoje,
        tamanhoPagina: 100,
      },
      sinal,
    ),
  );
  usePeriodico(() => {
    andamento.recarregar();
    feitas.recarregar();
  }, 20000);

  const lista = andamento.dados?.dados ?? [];
  const emRota = lista.filter(
    (p) =>
      p.statusAtual === "SAIU_PARA_ENTREGA" && p.entrega?.entregador?.id === eu,
  );
  const prontas = lista.filter(
    (p) =>
      p.statusAtual === "PRONTO" &&
      (!p.entrega?.entregador || p.entrega.entregador.id === eu),
  );

  async function sair(p: Pedido) {
    setOcupado(p.id);
    try {
      if (!p.entrega?.entregador) await pedidos.definirEntregador(p.id, eu);
      await pedidos.mudarStatus(p.id, "SAIU_PARA_ENTREGA");
      avisos.sucesso(`${numeroPedido(p.id)} saiu para entrega`);
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setOcupado(null);
      andamento.recarregar();
    }
  }

  async function confirmar(p: Pedido) {
    setOcupado(p.id);
    try {
      await pedidos.mudarStatus(p.id, "ENTREGUE_RETIRADO");
      avisos.sucesso(`${numeroPedido(p.id)} entregue. Boa!`);
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setOcupado(null);
      andamento.recarregar();
      feitas.recarregar();
    }
  }

  const totalHoje = feitas.dados?.paginacao.total;

  return (
    <>
      <header
        className={estilos.cabecalho}
        style={{ gap: 0, paddingBottom: 8 }}
      >
        <span className="ui-texto-sm ui-suave">
          {primeiroNome(usuario?.nome)}
          {totalHoje !== undefined &&
            ` · ${totalHoje} ${totalHoje === 1 ? "entrega" : "entregas"} hoje`}
        </span>
        <h1 className="ui-titulo-pagina">Minhas entregas</h1>
      </header>

      <main className={estilos.conteudo} style={{ paddingTop: 12 }}>
        {andamento.erro ? (
          <ErroAoCarregar
            erro={andamento.erro}
            aoTentarDeNovo={andamento.recarregar}
          />
        ) : !andamento.dados ? (
          <Esqueleto linhas={2} altura={180} rotulo="Carregando entregas" />
        ) : (
          <>
            {emRota.map((p) => {
              const e = p.entrega!;
              return (
                <section
                  key={p.id}
                  aria-labelledby={`h-rota-${p.id}`}
                  className="sc-ticket sc-ticket--entrega"
                  style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div className="ui-linha ui-linha--entre">
                    <h2
                      id={`h-rota-${p.id}`}
                      style={{ font: "600 26px/30px var(--font-display)" }}
                    >
                      <Link
                        to={`/pedidos/${p.id}`}
                        style={{ textDecoration: "none" }}
                      >
                        {numeroPedido(p.id)}
                      </Link>
                    </h2>
                    <span className="sc-badge sc-badge--entrega">
                      Em rota · {minutosDesde(e.dataHoraSaida)} min
                    </span>
                  </div>
                  <div className="ui-coluna" style={{ gap: 2 }}>
                    <span style={{ font: "800 18px/24px var(--font-sans)" }}>
                      {e.endereco.logradouro}, {e.endereco.numero}
                    </span>
                    <span
                      className="ui-suave"
                      style={{ font: "600 15px/22px var(--font-sans)" }}
                    >
                      {e.endereco.bairro} · {e.endereco.cidade}
                    </span>
                  </div>
                  <div className="ui-bloco ui-coluna" style={{ gap: 6 }}>
                    <div className="ui-valor" style={{ fontWeight: 700 }}>
                      <span>{p.cliente?.nome}</span>
                      <span>{telefone(p.cliente?.telefone)}</span>
                    </div>
                    <div className="ui-valor ui-valor--suave ui-texto-sm">
                      <span>{itensEmTexto(p)}</span>
                      <span style={{ whiteSpace: "nowrap" }}>
                        {cobranca(p)}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    <a
                      className="sc-btn sc-btn--ghost"
                      style={{ background: "var(--surface-300)" }}
                      href={linkDoMapa(p)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icone nome="local" />
                      Ver mapa
                    </a>
                    <a
                      className="sc-btn sc-btn--ghost"
                      style={{ background: "var(--surface-300)" }}
                      href={`tel:${p.cliente?.telefone.replace(/\D/g, "")}`}
                    >
                      <Icone nome="telefone" />
                      Ligar
                    </a>
                  </div>
                  <Botao
                    variante="primario"
                    grande
                    bloco
                    carregando={ocupado === p.id}
                    textoCarregando="Confirmando…"
                    onClick={() => confirmar(p)}
                  >
                    Confirmar entrega
                  </Botao>
                </section>
              );
            })}

            <section
              aria-labelledby="h-prontas"
              className="ui-coluna"
              style={{ gap: 10 }}
            >
              <h2 id="h-prontas" className="ui-titulo-secao">
                Prontas para sair
              </h2>
              {prontas.length === 0 ? (
                <p className="ui-texto-sm ui-suave">
                  Nenhuma entrega pronta agora.
                </p>
              ) : (
                prontas.map((p) => (
                  <article
                    key={p.id}
                    className="sc-ticket sc-ticket--pronto"
                    style={{
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      className="ui-coluna"
                      style={{ gap: 0, flex: 1, minWidth: 0 }}
                    >
                      <span
                        style={{ font: "600 20px/24px var(--font-display)" }}
                      >
                        {numeroPedido(p.id)}
                      </span>
                      <span style={{ font: "700 14px/20px var(--font-sans)" }}>
                        {p.entrega!.endereco.logradouro},{" "}
                        {p.entrega!.endereco.numero} ·{" "}
                        {p.entrega!.endereco.bairro}
                      </span>
                      <span
                        className="ui-suave"
                        style={{ font: "600 13px/18px var(--font-sans)" }}
                      >
                        Pronto há{" "}
                        {minutosDesde(
                          [...p.statusHistorico]
                            .reverse()
                            .find((h) => h.status === "PRONTO")?.dataHora,
                        )}{" "}
                        min · {cobranca(p)}
                        {!p.entrega?.entregador && " · sem entregador"}
                      </span>
                    </div>
                    <Botao
                      variante="fantasma"
                      style={{
                        background: "var(--surface-300)",
                        minHeight: 44,
                      }}
                      carregando={ocupado === p.id}
                      textoCarregando="Saindo…"
                      disabled={ocupado !== null && ocupado !== p.id}
                      onClick={() => sair(p)}
                    >
                      Sair
                    </Botao>
                  </article>
                ))
              )}
            </section>
          </>
        )}

        <section
          aria-labelledby="h-feitas"
          className="ui-coluna"
          style={{ gap: 10 }}
        >
          <h2 id="h-feitas" className="ui-titulo-secao">
            Entregues hoje
          </h2>
          {feitas.dados && feitas.dados.dados.length === 0 ? (
            <Vazio icone="moto">Nenhuma entrega concluída hoje.</Vazio>
          ) : (
            <div className="ui-cartao" style={{ gap: 4, padding: 8 }}>
              {feitas.dados?.dados.map((p) => (
                <Link
                  key={p.id}
                  to={`/pedidos/${p.id}`}
                  className="ui-linha"
                  style={{
                    minHeight: 48,
                    padding: "0 10px",
                    gap: 12,
                    color: "var(--ink)",
                    textDecoration: "none",
                  }}
                >
                  <span
                    style={{
                      width: 64,
                      font: "600 17px/22px var(--font-display)",
                    }}
                  >
                    {numeroPedido(p.id)}
                  </span>
                  <span className="ui-texto-sm ui-suave" style={{ flex: 1 }}>
                    {p.entrega?.endereco.bairro}
                  </span>
                  <span
                    className="sc-tnum"
                    style={{ font: "700 14px/20px var(--font-sans)" }}
                  >
                    {hora(p.entrega?.dataHoraEntrega)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
