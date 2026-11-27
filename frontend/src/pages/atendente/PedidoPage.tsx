import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAvisos } from "../../hooks/useAvisos";
import { useConsulta } from "../../hooks/useConsulta";
import { usePeriodico } from "../../hooks/usePeriodico";
import { useAoVivo } from "../../hooks/useAoVivo";
import { pedidos } from "../../services/pedidos";
import { formasPagamento, funcionarios } from "../../services/cadastros";
import { ErroDaApi } from "../../services/api";
import { Botao } from "../../components/ui/Botao";
import { Campo } from "../../components/ui/Campo";
import { Confirmacao } from "../../components/ui/Confirmacao";
import { Folha } from "../../components/ui/Folha";
import { Icone } from "../../components/ui/Icone";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ErroAoCarregar, Esqueleto } from "../../components/ui/Estados";
import { adicionaisEmTexto, nomeDoItem } from "../../components/pedido/resumo";
import { enderecoEmTexto } from "../../lib/clientes";
import { campoDeDinheiro, numeroDoCampo } from "../../lib/formularios";
import {
  hora,
  inicial,
  moeda,
  numeroPedido,
  paraNumero,
  primeiroNome,
  telefone,
} from "../../lib/formatadores";
import {
  ROTULO_ATENDIMENTO,
  ROTULO_CANAL,
  rotuloFormaPagamento,
} from "../../lib/rotulos";
import {
  classeDaComanda,
  classeDoSelo,
  estaEmAberto,
  proximoPasso,
  rotuloDoStatus,
} from "../../lib/status";
import type { Pedido, StatusPedido } from "../../types/dominio";
import estilos from "./Atendente.module.css";

/** Tela 7 — Detalhe do pedido (todos os cargos). */
export function PedidoPage() {
  const { id } = useParams();
  const idPedido = Number(id);
  const navegar = useNavigate();
  const avisos = useAvisos();
  const consulta = useConsulta(`pedido:${idPedido}`, (sinal) =>
    pedidos.buscar(idPedido, sinal),
  );
  const [atual, setAtual] = useState<Pedido | null>(null);
  const [mudando, setMudando] = useState(false);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const [recebendo, setRecebendo] = useState(false);
  // A cozinha e o entregador mudam o status de outros aparelhos.
  const aoVivo = useAoVivo(consulta.recarregar, (e) => e.id === idPedido);
  usePeriodico(consulta.recarregar, aoVivo ? 120000 : 30000);

  // A resposta das ações já traz o pedido atualizado; a consulta, quando
  // recarrega, volta a ser a fonte.
  const pedido =
    atual && atual.id === idPedido && consulta.carregando
      ? atual
      : consulta.dados;

  function voltar() {
    if (window.history.length > 1) navegar(-1);
    else navegar("/pedidos");
  }

  async function mudarStatus(status: StatusPedido, sucesso: string) {
    if (!pedido) return;
    setMudando(true);
    try {
      const novo = await pedidos.mudarStatus(pedido.id, status);
      setAtual(novo);
      consulta.recarregar();
      avisos.sucesso(sucesso);
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setMudando(false);
    }
  }

  const cabecalho = (
    <header
      className={estilos.cabecalho}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingBottom: 8,
      }}
    >
      <button
        type="button"
        className="sc-btn sc-btn--ghost ui-botao-icone"
        aria-label="Voltar"
        onClick={voltar}
      >
        <Icone nome="voltar" />
      </button>
      <h1 style={{ font: "600 22px/28px var(--font-display)" }}>Pedido</h1>
    </header>
  );

  if (consulta.erro) {
    return (
      <>
        {cabecalho}
        <main className={estilos.conteudo}>
          <ErroAoCarregar
            erro={consulta.erro}
            // Pedido que não existe não aparece tentando de novo.
            aoTentarDeNovo={
              consulta.erro instanceof ErroDaApi && consulta.erro.status === 404
                ? undefined
                : consulta.recarregar
            }
          />
        </main>
      </>
    );
  }
  if (!pedido) {
    return (
      <>
        {cabecalho}
        <main className={estilos.conteudo}>
          <Esqueleto linhas={4} altura={120} rotulo="Carregando pedido" />
        </main>
      </>
    );
  }

  const passo = proximoPasso(pedido.statusAtual, pedido.tipoAtendimento);
  const precisaEntregador =
    passo?.status === "SAIU_PARA_ENTREGA" && !pedido.entrega?.entregador;
  const saldo = paraNumero(pedido.totais.saldo);
  const pagos = pedido.pagamentos.filter((p) => !p.estornadoEm);
  const estornados = pedido.pagamentos.filter((p) => p.estornadoEm);

  return (
    <>
      {cabecalho}
      <main
        className={`${estilos.conteudo} sc-screen-enter`}
        style={{ gap: 14 }}
      >
        <section
          className={classeDaComanda(pedido.statusAtual)}
          style={{
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div className="ui-linha ui-linha--entre">
            <span
              style={{ font: "600 30px/34px var(--font-display)" }}
              className="sc-tnum"
            >
              {numeroPedido(pedido.id)}
            </span>
            <span aria-live="polite">
              <StatusBadge
                status={pedido.statusAtual}
                tipo={pedido.tipoAtendimento}
              />
            </span>
          </div>
          {pedido.cliente && (
            <span style={{ font: "700 15px/20px var(--font-sans)" }}>
              {pedido.cliente.nome}
              {/* Cliente anonimizado (LGPD) fica sem telefone. */}
              {pedido.cliente.telefone &&
                ` · ${telefone(pedido.cliente.telefone)}`}
            </span>
          )}
          <span className="ui-texto-sm ui-suave">
            {ROTULO_CANAL[pedido.canal]} ·{" "}
            {pedido.mesa
              ? `Mesa ${pedido.mesa.numero}`
              : ROTULO_ATENDIMENTO[pedido.tipoAtendimento]}{" "}
            · recebido por {primeiroNome(pedido.atendente.nome)} às{" "}
            {hora(pedido.dataHora)}
          </span>
        </section>

        {pedido.statusAtual === "ENTREGUE_RETIRADO" && (
          <Avaliacao
            pedido={pedido}
            aoAvaliar={(p) => {
              setAtual(p);
              consulta.recarregar();
            }}
          />
        )}

        <LinhaDoTempo pedido={pedido} />

        {pedido.entrega && (
          <Entrega
            pedido={pedido}
            aoMudar={(p) => {
              setAtual(p);
              consulta.recarregar();
            }}
          />
        )}

        <section
          aria-labelledby="h-conta"
          className="ui-cartao"
          style={{ gap: 6 }}
        >
          <h2
            id="h-conta"
            className="ui-titulo-cartao"
            style={{ marginBottom: 4 }}
          >
            Itens e pagamento
          </h2>
          {pedido.itens.map((item) => (
            <div key={item.id} className="ui-coluna" style={{ gap: 0 }}>
              <div className="ui-valor" style={{ fontWeight: 700 }}>
                <span>
                  {item.quantidade}× {nomeDoItem(item)}
                </span>
                <span className="sc-tnum">{moeda(item.subtotal)}</span>
              </div>
              {item.adicionais.length > 0 && (
                <span className="ui-texto-sm ui-suave">
                  {adicionaisEmTexto(item)}
                </span>
              )}
              {item.observacao && (
                <span className="sc-ticket__note" style={{ marginTop: 4 }}>
                  “{item.observacao}”
                </span>
              )}
            </div>
          ))}
          {pedido.observacoes && (
            <p className="ui-texto-sm" style={{ marginTop: 4 }}>
              <strong>Observações:</strong> {pedido.observacoes}
            </p>
          )}
          {paraNumero(pedido.totais.taxaEntrega) > 0 && (
            <div className="ui-valor ui-valor--suave">
              <span>Taxa de entrega</span>
              <span className="sc-tnum">
                {moeda(pedido.totais.taxaEntrega)}
              </span>
            </div>
          )}
          {pedido.cupom && (
            <div className="ui-valor ui-valor--suave">
              <span className="ui-linha">
                <span className="sc-promo">{pedido.cupom.codigo}</span> desconto
              </span>
              <span className="sc-tnum">
                − {moeda(pedido.totais.descontoCupom)}
              </span>
            </div>
          )}
          <div className="ui-valor ui-valor--total">
            <span>Total</span>
            <span className="sc-price">{moeda(pedido.totais.total)}</span>
          </div>
          {pagos.map((p) => (
            <span key={p.id} className="ui-texto-sm ui-suave">
              Pago em{" "}
              {rotuloFormaPagamento(p.formaPagamento.nome).toLowerCase()} ·{" "}
              {moeda(p.valorPago)}
            </span>
          ))}
          {estornados.length > 0 && (
            <span
              className="ui-texto-sm"
              style={{ color: "var(--danger-text)" }}
            >
              Estornado: {moeda(pedido.totais.totalEstornado)} (pedido cancelado
              depois de pago)
            </span>
          )}
          {saldo > 0 && (
            <div
              className="ui-linha ui-linha--entre ui-bloco"
              style={{ marginTop: 6 }}
            >
              <span style={{ font: "800 15px/20px var(--font-sans)" }}>
                Falta receber {moeda(saldo)}
              </span>
              <Botao
                variante="fantasma"
                style={{ background: "var(--surface-inset)", minHeight: 40 }}
                onClick={() => setRecebendo(true)}
              >
                <Icone nome="dinheiro" tamanho={18} />
                Receber
              </Botao>
            </div>
          )}
        </section>

        {estaEmAberto(pedido.statusAtual) && (
          <button
            type="button"
            className="ui-link"
            style={{ alignSelf: "center", color: "var(--danger-text)" }}
            onClick={() => setConfirmarCancelamento(true)}
          >
            Cancelar pedido
          </button>
        )}
      </main>

      <footer className={estilos.rodape}>
        {passo && precisaEntregador && (
          <span
            className="ui-texto-sm ui-suave"
            style={{ textAlign: "center" }}
          >
            Defina o entregador para o pedido sair.
          </span>
        )}
        {passo ? (
          <Botao
            variante="primario"
            grande
            bloco
            carregando={mudando}
            textoCarregando={passo.gerundio}
            disabled={precisaEntregador}
            onClick={() =>
              mudarStatus(
                passo.status,
                `${numeroPedido(pedido.id)}: ${rotuloDoStatus(passo.status, pedido.tipoAtendimento).toLowerCase()}`,
              )
            }
          >
            {passo.acao}
          </Botao>
        ) : (
          <Botao variante="fantasma" grande bloco onClick={voltar}>
            Voltar para pedidos
          </Botao>
        )}
      </footer>

      <Confirmacao
        aberta={confirmarCancelamento}
        titulo={`Cancelar o pedido ${numeroPedido(pedido.id)}?`}
        confirmar="Cancelar pedido"
        confirmando="Cancelando…"
        perigo
        aoFechar={() => setConfirmarCancelamento(false)}
        aoConfirmar={async () => {
          await mudarStatus(
            "CANCELADO",
            `${numeroPedido(pedido.id)} cancelado`,
          );
          setConfirmarCancelamento(false);
        }}
      >
        O pedido sai da cozinha e não pode ser reaberto.
        {paraNumero(pedido.totais.totalPago) > 0 &&
          ` Os ${moeda(pedido.totais.totalPago)} já pagos ficam registrados como estornados (devolva ao cliente).`}
        {pedido.cupom && " O cupom volta a valer para o cliente."}
      </Confirmacao>

      <FolhaPagamento
        aberta={recebendo}
        pedido={pedido}
        aoFechar={() => setRecebendo(false)}
        aoPagar={(p) => {
          setAtual(p);
          consulta.recarregar();
          setRecebendo(false);
        }}
      />
    </>
  );
}

/**
 * Caminho completo do pedido, com hora em cada etapa já feita. Cancelado
 * mostra só o que aconteceu: o caminho foi interrompido.
 */
function LinhaDoTempo({ pedido }: { pedido: Pedido }) {
  const caminho: StatusPedido[] = ["RECEBIDO", "EM_PREPARO", "PRONTO"];
  if (pedido.tipoAtendimento === "ENTREGA") caminho.push("SAIU_PARA_ENTREGA");
  caminho.push("ENTREGUE_RETIRADO");

  const historico = pedido.statusHistorico;
  const cancelado = pedido.statusAtual === "CANCELADO";
  const passos = cancelado
    ? historico.map((h) => ({
        status: h.status,
        dataHora: h.dataHora as string | null,
      }))
    : caminho.map((status) => ({
        status,
        dataHora: historico.find((h) => h.status === status)?.dataHora ?? null,
      }));

  return (
    <section
      aria-labelledby="h-tempo"
      className="ui-cartao"
      style={{ gap: 12 }}
    >
      <h2 id="h-tempo" className="ui-titulo-cartao">
        Linha do tempo
      </h2>
      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {passos.map(({ status, dataHora }) => {
          const feito = dataHora !== null;
          return (
            <li
              key={status}
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr auto",
                columnGap: 12,
                alignItems: "center",
                minHeight: 32,
              }}
            >
              <span
                aria-hidden="true"
                className={feito ? classeDoSelo(status) : undefined}
                style={{
                  width: 14,
                  height: 14,
                  padding: 0,
                  minHeight: 0,
                  borderRadius: 4,
                  justifySelf: "center",
                  background: feito ? undefined : "var(--surface-300)",
                  transition: "background-color 300ms ease",
                }}
              />
              <span
                style={{
                  font: `${feito ? 800 : 600} 15px/20px var(--font-sans)`,
                  color: feito ? "var(--ink)" : "var(--ink-muted)",
                }}
              >
                {rotuloDoStatus(status, pedido.tipoAtendimento)}
              </span>
              <span
                className="sc-tnum ui-suave"
                style={{ font: "700 14px/20px var(--font-sans)" }}
              >
                {feito ? hora(dataHora) : "—"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Endereço, entregador e troca de entregador enquanto o pedido não saiu. */
function Entrega({
  pedido,
  aoMudar,
}: {
  pedido: Pedido;
  aoMudar(p: Pedido): void;
}) {
  const avisos = useAvisos();
  const entrega = pedido.entrega!;
  // Mesma regra da API: depois que saiu, o entregador fica.
  const podeTrocar =
    pedido.statusAtual === "RECEBIDO" ||
    pedido.statusAtual === "EM_PREPARO" ||
    pedido.statusAtual === "PRONTO";
  const [salvando, setSalvando] = useState(false);
  // Só busca a lista quando ainda dá para trocar.
  const entregadores = useConsulta(`entregadores:${podeTrocar}`, (sinal) =>
    podeTrocar
      ? funcionarios.listar(
          { cargo: "entregador", ativo: true, tamanhoPagina: 100 },
          sinal,
        )
      : Promise.resolve(undefined),
  );

  const info = entrega.dataHoraEntrega
    ? `Entregou às ${hora(entrega.dataHoraEntrega)}`
    : entrega.dataHoraSaida
      ? `Saiu às ${hora(entrega.dataHoraSaida)}`
      : "Aguardando a saída";

  async function definir(valor: string) {
    setSalvando(true);
    try {
      const novo = await pedidos.definirEntregador(
        pedido.id,
        valor ? Number(valor) : null,
      );
      aoMudar(novo);
      avisos.sucesso(valor ? "Entregador definido" : "Entregador retirado");
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section
      aria-labelledby="h-entrega"
      className="ui-cartao"
      style={{ gap: 10 }}
    >
      <h2 id="h-entrega" className="ui-titulo-cartao">
        Entrega
      </h2>
      <div className="ui-linha" style={{ alignItems: "flex-start", gap: 12 }}>
        <Icone nome="local" />
        <span style={{ font: "600 15px/22px var(--font-sans)" }}>
          {enderecoEmTexto(entrega.endereco)} · {entrega.endereco.cidade}
        </span>
      </div>
      {entrega.entregador && (
        <div className="ui-linha ui-bloco" style={{ gap: 12 }}>
          <span
            className="ui-avatar"
            aria-hidden="true"
            style={{ background: "var(--surface-inset)" }}
          >
            {inicial(entrega.entregador.nome)}
          </span>
          <div className="ui-coluna" style={{ gap: 0, flex: 1 }}>
            <span style={{ font: "800 15px/20px var(--font-sans)" }}>
              {entrega.entregador.nome}
            </span>
            <span
              style={{ font: "600 13px/18px var(--font-sans)" }}
              className="ui-suave"
            >
              {info}
            </span>
          </div>
        </div>
      )}
      {podeTrocar && (
        <Campo rotulo={entrega.entregador ? "Trocar entregador" : "Entregador"}>
          <select
            value={entrega.entregador?.id ?? ""}
            disabled={salvando || !entregadores.dados}
            onChange={(e) => definir(e.target.value)}
          >
            <option value="">
              {entregadores.dados ? "Definir depois" : "Carregando…"}
            </option>
            {entregadores.dados?.dados.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </Campo>
      )}
    </section>
  );
}

/** Nota de 1 a 5 do pedido entregue; depois de salva, só leitura. */
function Avaliacao({
  pedido,
  aoAvaliar,
}: {
  pedido: Pedido;
  aoAvaliar(p: Pedido): void;
}) {
  const avisos = useAvisos();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [salvando, setSalvando] = useState(false);
  const feita = pedido.avaliacao;
  const mostrada = feita?.nota ?? nota;

  async function salvar() {
    setSalvando(true);
    try {
      aoAvaliar(
        await pedidos.avaliar(pedido.id, nota, comentario.trim() || undefined),
      );
      avisos.sucesso("Avaliação registrada. Obrigado!");
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section
      aria-labelledby="h-aval"
      className="ui-cartao ui-cartao--plano sc-enter"
      style={{ gap: 10 }}
    >
      <h2 id="h-aval" className="ui-titulo-cartao">
        {feita ? "Avaliação do cliente" : "Como foi o pedido?"}
      </h2>
      {!feita && (
        <span className="ui-texto-sm ui-suave">
          Registre a nota que o cliente deu (opcional).
        </span>
      )}
      <div role="radiogroup" aria-label="Nota de 1 a 5" className="ui-linha">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={mostrada === n}
            aria-label={`Nota ${n}`}
            disabled={!!feita}
            onClick={() => setNota(n)}
            style={{
              width: 48,
              height: 48,
              border: 0,
              borderRadius: "var(--radius-md)",
              background:
                n <= mostrada ? "var(--mustard)" : "var(--surface-300)",
              color: n <= mostrada ? "var(--on-mustard)" : "var(--ink-muted)",
              display: "grid",
              placeItems: "center",
              boxShadow: "var(--shadow-sm)",
              cursor: feita ? "default" : "pointer",
              transition: "background-color 120ms ease",
            }}
          >
            <Icone nome="estrela" preenchido={n <= mostrada} />
          </button>
        ))}
      </div>
      {feita
        ? feita.comentario && (
            <p className="ui-texto-sm">“{feita.comentario}”</p>
          )
        : nota > 0 && (
            <>
              <Campo rotulo="Comentário (opcional)">
                <textarea
                  rows={2}
                  maxLength={500}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />
              </Campo>
              <Botao
                variante="fantasma"
                onClick={salvar}
                carregando={salvando}
                textoCarregando="Salvando…"
                style={{ alignSelf: "flex-start" }}
              >
                Salvar avaliação
              </Botao>
            </>
          )}
    </section>
  );
}

/** Recebe parte ou todo o saldo; em dinheiro, calcula o troco. */
function FolhaPagamento({
  aberta,
  pedido,
  aoFechar,
  aoPagar,
}: {
  aberta: boolean;
  pedido: Pedido;
  aoFechar(): void;
  aoPagar(p: Pedido): void;
}) {
  const avisos = useAvisos();
  const saldo = paraNumero(pedido.totais.saldo);
  const formas = useConsulta(`pagamento:formas:${aberta}`, (sinal) =>
    aberta
      ? formasPagamento.listar({ tamanhoPagina: 100 }, sinal)
      : Promise.resolve(undefined),
  );
  const [formaId, setFormaId] = useState<number | null>(null);
  const [valor, setValor] = useState(campoDeDinheiro(saldo));
  const [salvando, setSalvando] = useState(false);

  const lista = formas.dados?.dados ?? [];
  const forma = lista.find((f) => f.id === formaId) ?? lista[0];
  const recebido = numeroDoCampo(valor);
  const ehDinheiro = forma?.nome === "dinheiro";
  // Só em dinheiro se recebe a mais (troco); cartão e Pix não passam do saldo.
  // A folga de 0,0001 absorve arredondamento de ponto flutuante.
  const troco = ehDinheiro && recebido > saldo ? recebido - saldo : 0;
  const invalido =
    !Number.isFinite(recebido) ||
    recebido <= 0 ||
    (!ehDinheiro && recebido > saldo + 0.0001);

  async function pagar() {
    if (!forma || invalido) return;
    setSalvando(true);
    try {
      // Registra o que entra na conta; o troco volta ao cliente.
      const novo = await pedidos.pagar(
        pedido.id,
        forma.id,
        Math.min(recebido, saldo),
      );
      aoPagar(novo);
      avisos.sucesso(
        troco > 0
          ? `Pagamento registrado · troco ${moeda(troco)}`
          : "Pagamento registrado",
      );
    } catch (erro) {
      avisos.erro(erro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Folha
      aberta={aberta}
      aoFechar={aoFechar}
      titulo="Receber pagamento"
      subtitulo={<span className="sc-price">Falta {moeda(saldo)}</span>}
      largura={480}
      rodape={
        <Botao
          variante="primario"
          grande
          bloco
          disabled={invalido || !forma}
          carregando={salvando}
          textoCarregando="Registrando…"
          onClick={pagar}
        >
          Registrar pagamento
        </Botao>
      }
    >
      <Campo rotulo="Forma de pagamento">
        <select
          value={forma?.id ?? ""}
          onChange={(e) => setFormaId(Number(e.target.value))}
        >
          {lista.map((f) => (
            <option key={f.id} value={f.id}>
              {rotuloFormaPagamento(f.nome)}
            </option>
          ))}
        </select>
      </Campo>
      <Campo
        rotulo={ehDinheiro ? "Valor recebido (R$)" : "Valor (R$)"}
        ajuda={
          troco > 0
            ? `Troco: ${moeda(troco)}`
            : ehDinheiro
              ? "Se receber a mais, o troco aparece aqui."
              : undefined
        }
        erro={
          !ehDinheiro && recebido > saldo + 0.0001
            ? "O valor passa do que falta pagar."
            : undefined
        }
      >
        <input
          inputMode="decimal"
          className="sc-input sc-tnum"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </Campo>
    </Folha>
  );
}
