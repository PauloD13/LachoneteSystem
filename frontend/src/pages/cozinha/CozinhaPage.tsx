import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { useAvisos } from "../../hooks/useAvisos";
import { useConsulta } from "../../hooks/useConsulta";
import { usePeriodico } from "../../hooks/usePeriodico";
import { pedidos } from "../../services/pedidos";
import { Botao } from "../../components/ui/Botao";
import { Icone } from "../../components/ui/Icone";
import { ErroAoCarregar } from "../../components/ui/Estados";
import {
  adicionaisEmTexto,
  nomeDoItem,
  origemDoPedido,
} from "../../components/pedido/resumo";
import { classeDaComanda, classeDoSelo } from "../../lib/status";
import { hora, minutosDesde, numeroPedido } from "../../lib/formatadores";
import { telaInicial } from "../../lib/telaInicial";
import type { Pedido, StatusPedido } from "../../types/dominio";
import estilos from "./CozinhaPage.module.css";

const COLUNAS: {
  status: StatusPedido;
  titulo: string;
  acao?: { para: StatusPedido; rotulo: string; gerundio: string };
  vazio: string;
}[] = [
  {
    status: "RECEBIDO",
    titulo: "Recebidos",
    acao: {
      para: "EM_PREPARO",
      rotulo: "Iniciar preparo",
      gerundio: "Iniciando…",
    },
    vazio: "Nenhum pedido novo.",
  },
  {
    status: "EM_PREPARO",
    titulo: "Em preparo",
    acao: {
      para: "PRONTO",
      rotulo: "Marcar como pronto",
      gerundio: "Marcando…",
    },
    vazio: "Nada no fogo agora.",
  },
  { status: "PRONTO", titulo: "Prontos", vazio: "Nenhum pedido esperando." },
];

// Tempo a partir do qual o relógio da comanda fica vermelho.
const MINUTOS_DE_ALERTA = 15;

/** Quando o pedido entrou na coluna (o registro mais recente desse status). */
function quandoEntrou(pedido: Pedido, status: StatusPedido): string {
  return (
    [...pedido.statusHistorico].reverse().find((h) => h.status === status)
      ?.dataHora ?? pedido.dataHora
  );
}

/** Tela 8 — Cozinha (tablet na horizontal). Atualiza a cada 10 s. */
export function CozinhaPage() {
  const { usuario } = useAuth();
  const avisos = useAvisos();
  const [agora, setAgora] = useState(() => Date.now());
  const [movido, setMovido] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const timerDestaque = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fila = useConsulta("cozinha", (sinal) =>
    pedidos.listar(
      {
        status: ["RECEBIDO", "EM_PREPARO", "PRONTO"],
        ordem: "antigos",
        tamanhoPagina: 100,
      },
      sinal,
    ),
  );
  usePeriodico(fila.recarregar, 10000);
  // Os relógios das comandas andam sem precisar buscar de novo.
  usePeriodico(() => setAgora(Date.now()), 30000);
  useEffect(() => () => clearTimeout(timerDestaque.current), []);

  async function avancar(pedido: Pedido, para: StatusPedido) {
    setOcupado(pedido.id);
    try {
      await pedidos.mudarStatus(pedido.id, para);
      // Destaca por 1 s a comanda que mudou de coluna.
      setMovido(pedido.id);
      clearTimeout(timerDestaque.current);
      timerDestaque.current = setTimeout(() => setMovido(null), 1000);
      avisos.sucesso(
        para === "PRONTO"
          ? `${numeroPedido(pedido.id)} pronto. O balcão foi avisado.`
          : `${numeroPedido(pedido.id)} em preparo.`,
      );
      fila.recarregar();
    } catch (erro) {
      avisos.erro(erro);
      // Outro aparelho pode ter mexido no pedido: mostra o estado real.
      fila.recarregar();
    } finally {
      setOcupado(null);
    }
  }

  const lista = fila.dados?.dados ?? [];
  const naFila = lista.filter((p) => p.statusAtual !== "PRONTO");
  const maisAntigo = naFila.reduce(
    (m, p) => Math.max(m, minutosDesde(p.dataHora, agora)),
    0,
  );
  const resumo = !fila.dados
    ? "Carregando…"
    : naFila.length
      ? `${naFila.length} ${naFila.length === 1 ? "pedido" : "pedidos"} na fila · mais antigo há ${maisAntigo} min`
      : "Fila zerada. Bom trabalho!";

  return (
    <div className={`${estilos.tela} sc-root`}>
      <header className={estilos.cabecalho}>
        <div
          className="ui-linha"
          style={{ alignItems: "baseline", gap: 16, flexWrap: "wrap" }}
        >
          <h1 style={{ font: "600 34px/40px var(--font-display)" }}>Cozinha</h1>
          <span
            aria-live="polite"
            className="ui-suave"
            style={{ font: "700 16px/22px var(--font-sans)" }}
          >
            {resumo}
          </span>
        </div>
        <div className="ui-linha" style={{ gap: 12 }}>
          <span
            className="sc-tnum"
            style={{ font: "600 28px/32px var(--font-display)" }}
          >
            {hora(new Date(agora).toISOString())}
          </span>
          {usuario && telaInicial(usuario) !== "/cozinha" ? (
            <Link
              to={telaInicial(usuario)}
              className="sc-btn sc-btn--ghost"
              style={{ minHeight: 48 }}
            >
              <Icone nome="voltar" />
              Sair da cozinha
            </Link>
          ) : (
            <Link
              to="/perfil"
              className="sc-btn sc-btn--ghost ui-botao-icone"
              aria-label="Perfil e ajustes"
              style={{ width: 48, height: 48 }}
            >
              <Icone nome="ajustes" />
            </Link>
          )}
        </div>
      </header>

      {fila.erro && !fila.dados ? (
        <ErroAoCarregar erro={fila.erro} aoTentarDeNovo={fila.recarregar} />
      ) : (
        <main className={estilos.colunas}>
          {COLUNAS.map((coluna) => {
            const doStatus = lista.filter(
              (p) => p.statusAtual === coluna.status,
            );
            return (
              <section
                key={coluna.status}
                aria-label={coluna.titulo}
                className={estilos.coluna}
              >
                <div
                  className="ui-linha ui-linha--entre"
                  style={{ padding: "2px 4px" }}
                >
                  <h2 className="ui-titulo-secao">{coluna.titulo}</h2>
                  <span
                    className={classeDoSelo(coluna.status)}
                    style={{ fontSize: 15, padding: "6px 12px" }}
                  >
                    {fila.dados ? doStatus.length : "–"}
                  </span>
                </div>
                {!fila.dados ? (
                  <div
                    className="sc-skeleton"
                    style={{ height: 180, borderRadius: "var(--radius-lg)" }}
                  />
                ) : doStatus.length === 0 ? (
                  <p
                    className="ui-suave"
                    style={{
                      padding: "24px 8px",
                      textAlign: "center",
                      font: "700 15px/22px var(--font-sans)",
                    }}
                  >
                    {coluna.vazio}
                  </p>
                ) : (
                  doStatus.map((p) => {
                    const minutos = minutosDesde(
                      coluna.status === "PRONTO"
                        ? quandoEntrou(p, "PRONTO")
                        : p.dataHora,
                      agora,
                    );
                    const atrasado =
                      coluna.status !== "PRONTO" &&
                      minutos >= MINUTOS_DE_ALERTA;
                    return (
                      <article
                        key={p.id}
                        className={[
                          classeDaComanda(p.statusAtual),
                          estilos.comanda,
                          movido === p.id && `sc-enter ${estilos.destaque}`,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <header className={estilos.cabecaComanda}>
                          <div className="ui-coluna" style={{ gap: 0 }}>
                            <span
                              style={{
                                font: "600 28px/32px var(--font-display)",
                              }}
                            >
                              {numeroPedido(p.id)}
                            </span>
                            <span
                              className="ui-suave"
                              style={{ font: "700 14px/20px var(--font-sans)" }}
                            >
                              {origemDoPedido(p)}
                            </span>
                          </div>
                          <span
                            className="sc-tnum"
                            style={{
                              font: "800 16px/22px var(--font-sans)",
                              paddingTop: 4,
                              color: atrasado
                                ? "var(--danger-text)"
                                : "var(--ink-muted)",
                            }}
                          >
                            {coluna.status === "PRONTO"
                              ? minutos
                                ? `há ${minutos} min`
                                : "agora"
                              : `${minutos} min`}
                          </span>
                        </header>
                        <ul
                          className="sc-ticket__items"
                          style={{ paddingTop: 6, gap: 10 }}
                        >
                          {p.itens.map((i) => (
                            <li key={i.id} className="sc-ticket__item">
                              <span className="sc-ticket__qty">
                                {i.quantidade}×
                              </span>
                              <span
                                className="sc-ticket__name"
                                style={{ fontSize: 17 }}
                              >
                                {nomeDoItem(i)}
                              </span>
                              {i.adicionais.length > 0 && (
                                <span className="sc-ticket__extra">
                                  {adicionaisEmTexto(i)}
                                </span>
                              )}
                              {i.observacao && (
                                <span className="sc-ticket__note">
                                  “{i.observacao}”
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                        {p.observacoes && (
                          <p
                            className="ui-texto-sm"
                            style={{ padding: "0 20px 12px" }}
                          >
                            <strong>Obs.:</strong> {p.observacoes}
                          </p>
                        )}
                        <div style={{ padding: "0 16px 16px" }}>
                          {coluna.acao ? (
                            <Botao
                              variante="primario"
                              grande
                              bloco
                              carregando={ocupado === p.id}
                              textoCarregando={coluna.acao.gerundio}
                              onClick={() => avancar(p, coluna.acao!.para)}
                            >
                              {coluna.acao.rotulo}
                            </Botao>
                          ) : (
                            <p
                              className="ui-suave"
                              style={{ font: "700 15px/22px var(--font-sans)" }}
                            >
                              {p.tipoAtendimento === "ENTREGA"
                                ? "Aguardando o entregador"
                                : p.mesa
                                  ? `Levar à mesa ${p.mesa.numero}`
                                  : "Chamar o cliente no balcão"}
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
            );
          })}
        </main>
      )}
    </div>
  );
}
