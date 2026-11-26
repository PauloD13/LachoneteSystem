import { useState } from "react";
import { Link } from "react-router";
import { useConsulta } from "../../hooks/useConsulta";
import { relatorios } from "../../services/pedidos";
import { funcionarios } from "../../services/cadastros";
import { Chip } from "../../components/ui/Chip";
import { Campo } from "../../components/ui/Campo";
import { ErroAoCarregar, Esqueleto, Vazio } from "../../components/ui/Estados";
import {
  hojeISO,
  inicial,
  moeda,
  quantidade,
  somarDiasISO,
} from "../../lib/formatadores";
import { ROTULO_UNIDADE } from "../../lib/rotulos";

type Periodo = "hoje" | "semana" | "mes" | "outro";

/**
 * Período em dias AAAA-MM-DD, incluindo hoje: "semana" são os últimos 7 dias
 * e "mês" começa no dia 1. Contas em texto, sem Date, para não errar o fuso.
 */
function intervalo(
  periodo: Periodo,
  hoje: string,
): { dataInicio: string; dataFim: string } {
  if (periodo === "hoje") return { dataInicio: hoje, dataFim: hoje };
  if (periodo === "semana")
    return { dataInicio: somarDiasISO(hoje, -6), dataFim: hoje };
  return { dataInicio: `${hoje.slice(0, 8)}01`, dataFim: hoje };
}

const curto = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** Tela 14 — Relatórios: mais vendidos, vendas por atendente, consumo e equipe. */
export function RelatoriosPage() {
  const hoje = hojeISO();
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [outro, setOutro] = useState(intervalo("semana", hoje));
  const p = periodo === "outro" ? outro : intervalo(periodo, hoje);
  const chave = `${p.dataInicio}:${p.dataFim}`;

  const top = useConsulta(`rel:top:${chave}`, (s) =>
    relatorios.maisVendidos({ ...p, limite: 8 }, s),
  );
  const atendentes = useConsulta(`rel:at:${chave}`, (s) =>
    relatorios.vendasPorAtendente(p, s),
  );
  const consumo = useConsulta(`rel:cons:${chave}`, (s) =>
    relatorios.consumoIngredientes(p, s),
  );
  const equipe = useConsulta("rel:equipe", (s) =>
    funcionarios.listar({ ativo: true, tamanhoPagina: 100 }, s),
  );

  // Largura das barras relativa ao mais vendido; o 1 evita dividir por zero.
  const maior = Math.max(
    1,
    ...(top.dados?.map((t) => t.quantidadeVendida) ?? [1]),
  );
  // Só para exibir a soma (não volta para a API), então Number basta.
  const totalPeriodo =
    atendentes.dados?.reduce((s, a) => s + Number(a.totalVendido), 0) ?? 0;

  return (
    <>
      <header className="ui-cabecalho-gerencia">
        <div className="ui-coluna" style={{ gap: 0 }}>
          <h1>Relatórios</h1>
          <span
            className="ui-suave"
            style={{ font: "600 15px/22px var(--font-sans)" }}
          >
            {curto(p.dataInicio)} – {curto(p.dataFim)} · pedidos cancelados
            ficam de fora
          </span>
        </div>
        <div
          className="ui-linha ui-linha--quebra"
          role="group"
          aria-label="Período"
        >
          <Chip
            selecionado={periodo === "hoje"}
            onClick={() => setPeriodo("hoje")}
          >
            Hoje
          </Chip>
          <Chip
            selecionado={periodo === "semana"}
            onClick={() => setPeriodo("semana")}
          >
            7 dias
          </Chip>
          <Chip
            selecionado={periodo === "mes"}
            onClick={() => setPeriodo("mes")}
          >
            Este mês
          </Chip>
          <Chip
            selecionado={periodo === "outro"}
            onClick={() => setPeriodo("outro")}
          >
            Outro período
          </Chip>
        </div>
      </header>
      {periodo === "outro" && (
        <div className="ui-linha ui-linha--quebra sc-enter">
          <Campo rotulo="De">
            <input
              type="date"
              value={outro.dataInicio}
              max={outro.dataFim}
              onChange={(e) =>
                e.target.value &&
                setOutro((o) => ({ ...o, dataInicio: e.target.value }))
              }
            />
          </Campo>
          <Campo rotulo="Até">
            <input
              type="date"
              value={outro.dataFim}
              min={outro.dataInicio}
              max={hoje}
              onChange={(e) =>
                e.target.value &&
                setOutro((o) => ({ ...o, dataFim: e.target.value }))
              }
            />
          </Campo>
        </div>
      )}

      <div className="ui-paineis">
        <section
          aria-labelledby="h-top"
          className="ui-cartao ui-painel-metade"
          style={{ gap: 10 }}
        >
          <div className="ui-linha ui-linha--entre">
            <h2 id="h-top" className="ui-titulo-secao">
              Mais vendidos
            </h2>
            <span className="ui-texto-sm ui-suave">unidades</span>
          </div>
          {top.erro ? (
            <ErroAoCarregar erro={top.erro} aoTentarDeNovo={top.recarregar} />
          ) : !top.dados ? (
            <Esqueleto linhas={5} altura={28} />
          ) : top.dados.length === 0 ? (
            <Vazio icone="grafico">Nenhuma venda no período.</Vazio>
          ) : (
            <table className="sr-only">
              <caption>Mais vendidos no período</caption>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Unidades</th>
                  <th>Receita</th>
                </tr>
              </thead>
              <tbody>
                {top.dados.map((t) => (
                  <tr key={t.itemVendavelId}>
                    <td>{t.nome}</td>
                    <td>{t.quantidadeVendida}</td>
                    <td>{moeda(t.receita)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {top.dados?.map((t) => (
            <div
              key={t.itemVendavelId}
              className="ui-barra"
              title={`${t.nome}: ${t.quantidadeVendida} unidades · ${moeda(t.receita)}`}
              aria-hidden="true"
            >
              <span
                style={{
                  font: "700 14px/20px var(--font-sans)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.nome}
              </span>
              <span className="ui-barra__trilho">
                <span
                  className="ui-barra__valor"
                  style={{ width: `${(t.quantidadeVendida / maior) * 100}%` }}
                />
              </span>
              <span
                className="sc-tnum"
                style={{
                  textAlign: "right",
                  font: "800 14px/20px var(--font-sans)",
                }}
              >
                {t.quantidadeVendida}
              </span>
            </div>
          ))}
        </section>

        <section
          aria-labelledby="h-at"
          className="ui-cartao ui-painel-metade"
          style={{ gap: 6 }}
        >
          <h2 id="h-at" className="ui-titulo-secao">
            Vendas por atendente
          </h2>
          <p className="ui-texto-sm ui-suave">
            Itens vendidos (com adicionais), base para a comissão.
          </p>
          {atendentes.erro ? (
            <ErroAoCarregar
              erro={atendentes.erro}
              aoTentarDeNovo={atendentes.recarregar}
            />
          ) : !atendentes.dados ? (
            <Esqueleto linhas={3} altura={36} />
          ) : atendentes.dados.length === 0 ? (
            <Vazio icone="pessoas">Nenhuma venda no período.</Vazio>
          ) : (
            <table className="ui-tabela">
              <thead>
                <tr>
                  <th>Atendente</th>
                  <th className="ui-direita">Pedidos</th>
                  <th className="ui-direita">Total</th>
                </tr>
              </thead>
              <tbody>
                {atendentes.dados.map((a) => (
                  <tr key={a.funcionarioId}>
                    <td style={{ fontWeight: 800 }}>{a.nome}</td>
                    <td className="ui-direita sc-tnum">
                      {a.quantidadePedidos}
                    </td>
                    <td className="ui-direita sc-tnum">
                      {moeda(a.totalVendido)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={2}
                    style={{ background: "none", fontWeight: 800 }}
                  >
                    Total do período
                  </td>
                  <td
                    className="ui-direita sc-tnum"
                    style={{ background: "none", fontWeight: 800 }}
                  >
                    {moeda(totalPeriodo)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        <section
          aria-labelledby="h-cons"
          className="ui-cartao ui-painel-metade"
          style={{ gap: 6 }}
        >
          <div className="ui-linha ui-linha--entre">
            <h2 id="h-cons" className="ui-titulo-secao">
              Consumo estimado
            </h2>
            <span className="ui-texto-sm ui-suave">pela ficha técnica</span>
          </div>
          {consumo.erro ? (
            <ErroAoCarregar
              erro={consumo.erro}
              aoTentarDeNovo={consumo.recarregar}
            />
          ) : !consumo.dados ? (
            <Esqueleto linhas={4} altura={32} />
          ) : consumo.dados.length === 0 ? (
            <Vazio icone="estoque">
              Sem consumo no período (ou produtos sem ficha técnica).
            </Vazio>
          ) : (
            <table className="ui-tabela">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th className="ui-direita">Consumido</th>
                  <th className="ui-direita">Em estoque</th>
                </tr>
              </thead>
              <tbody>
                {consumo.dados.map((c) => (
                  <tr key={c.ingredienteId}>
                    <td style={{ fontWeight: 800 }}>{c.nome}</td>
                    <td className="ui-direita sc-tnum">
                      {quantidade(c.consumoEstimado)}{" "}
                      {ROTULO_UNIDADE[c.unidadeMedida]}
                    </td>
                    <td className="ui-direita sc-tnum ui-suave">
                      {quantidade(c.quantidadeEstoque)}{" "}
                      {ROTULO_UNIDADE[c.unidadeMedida]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section
          aria-labelledby="h-eq"
          className="ui-cartao ui-painel-metade"
          style={{ gap: 6 }}
        >
          <div className="ui-linha ui-linha--entre">
            <h2 id="h-eq" className="ui-titulo-secao">
              Equipe em atividade
            </h2>
            <Link to="/gerencia/equipe" className="sc-btn sc-btn--ghost">
              Gerenciar
            </Link>
          </div>
          {equipe.dados?.dados.map((f) => (
            <div
              key={f.id}
              className="ui-linha"
              style={{ gap: 12, minHeight: 48 }}
            >
              <span className="ui-avatar" aria-hidden="true">
                {inicial(f.nome)}
              </span>
              <span style={{ flex: 1, fontWeight: 800 }}>{f.nome}</span>
              <span className="ui-texto-sm ui-suave">
                {f.cargos.join(" · ") || "sem cargo"}
              </span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
