import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAvisos } from "../../hooks/useAvisos";
import { useCarrinho } from "../../hooks/useCarrinho";
import { useConsulta } from "../../hooks/useConsulta";
import { formasPagamento } from "../../services/cadastros";
import { pedidos } from "../../services/pedidos";
import { ErroDaApi, mensagemDeErro } from "../../services/api";
import { Segmentado } from "../../components/ui/Segmentado";
import { Botao } from "../../components/ui/Botao";
import { Campo } from "../../components/ui/Campo";
import { Icone } from "../../components/ui/Icone";
import { Vazio } from "../../components/ui/Estados";
import { FolhaCliente } from "../../components/pedido/FolhaCliente";
import { FolhaMesa } from "../../components/pedido/FolhaMesa";
import { novaChave, precoUnitario } from "../../contexts/carrinho-contexto";
import { montarPedido, pagamentosSemTroco } from "../../lib/montarPedido";
import { campoDeDinheiro, numeroDoCampo } from "../../lib/formularios";
import { temEnderecoCompleto } from "../../lib/clientes";
import {
  moeda,
  numeroPedido,
  paraNumero,
  primeiroNome,
} from "../../lib/formatadores";
import { rotuloFormaPagamento } from "../../lib/rotulos";
import type {
  Endereco,
  Pedido,
  PedidoSimulado,
  TipoAtendimento,
} from "../../types/dominio";
import estilos from "./Atendente.module.css";

/** Mensagem legível de um erro da simulação/registro (inclui erros por campo). */
function motivo(erro: unknown): string {
  if (erro instanceof ErroDaApi && erro.status === 400) {
    const primeiro = Object.values(erro.campos).find((m) => m?.[0])?.[0];
    if (primeiro) return primeiro;
  }
  return mensagemDeErro(erro);
}

const ENDERECO_VAZIO: Endereco = {
  logradouro: "",
  numero: "",
  bairro: "",
  cidade: "",
  cep: "",
};

/** Tela 5 — Fechamento do pedido. */
export function FechamentoPage() {
  const avisos = useAvisos();
  const { carrinho, alterar, atualizarItem, removerItem, limpar } =
    useCarrinho();
  const [folha, setFolha] = useState<"cliente" | "mesa" | null>(null);
  const [cupomDigitado, setCupomDigitado] = useState(carrinho.cupom);
  const [taxaDigitada, setTaxaDigitada] = useState(
    campoDeDinheiro(carrinho.taxaEntrega),
  );
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<Pedido | null>(null);
  const [simulacao, setSimulacao] = useState<{
    chave: string;
    resultado?: PedidoSimulado;
    erro?: unknown;
  } | null>(null);
  // Último cálculo que deu certo: continua na tela enquanto há um erro.
  const [ultimoResultado, setUltimoResultado] = useState<PedidoSimulado>();

  const formas = useConsulta("fechamento:formas", (sinal) =>
    formasPagamento.listar({ tamanhoPagina: 100 }, sinal),
  );
  const idDoDinheiro = formas.dados?.dados.find(
    (f) => f.nome === "dinheiro",
  )?.id;

  // Primeira linha em dinheiro (o mais comum no balcão); as seguintes, uma
  // forma ainda não usada.
  function proximaForma(): number {
    const lista = formas.dados?.dados ?? [];
    const usadas = new Set(carrinho.pagamentos.map((p) => p.formaPagamentoId));
    if (idDoDinheiro !== undefined && !usadas.has(idDoDinheiro))
      return idDoDinheiro;
    return (lista.find((f) => !usadas.has(f.id)) ?? lista[0]).id;
  }

  const ehEntrega = carrinho.atendimento === "ENTREGA";
  const ehLocal = carrinho.atendimento === "CONSUMO_LOCAL";

  // Total de referência para o troco: o da última simulação (ou a estimativa).
  const totalReferencia =
    paraNumero(simulacao?.resultado?.totais.total) ||
    carrinho.itens.reduce((s, i) => s + precoUnitario(i) * i.quantidade, 0);
  // A API recusa pagamento acima do total: o excesso em dinheiro vira troco
  // na tela e não vai no pedido.
  const { pagamentos: pagamentosAjustados, troco } = pagamentosSemTroco(
    carrinho.pagamentos,
    totalReferencia,
    idDoDinheiro,
  );
  const corpo = montarPedido(carrinho, pagamentosAjustados);
  // O corpo em texto vira a chave da simulação: só simula de novo quando o
  // pedido muda de verdade, e não a cada renderização.
  const chaveDoCorpo = JSON.stringify(corpo);

  // Bloqueios que a própria tela já sabe explicar (antes de perguntar ao servidor).
  let bloqueio = "";
  if (carrinho.itens.length === 0) bloqueio = "Adicione pelo menos um item.";
  else if ((carrinho.canal !== "BALCAO" || ehEntrega) && !carrinho.cliente)
    bloqueio = ehEntrega
      ? "Escolha o cliente para fazer a entrega."
      : "Pedidos por telefone ou app precisam do cliente.";
  else if (ehLocal && !carrinho.mesa) bloqueio = "Escolha a mesa do pedido.";
  else if (ehEntrega && !carrinho.cliente?.temEndereco && !carrinho.endereco)
    bloqueio = "Informe o endereço de entrega.";
  else if (carrinho.cupom && !carrinho.cliente)
    bloqueio = "Cupom só vale para cliente cadastrado.";

  // Simula no servidor (preços, promoções, cupom, erros) a cada mudança. A
  // espera de 350 ms junta as teclas de quem está digitando num pedido só, e
  // a resposta de uma simulação antiga é descartada (abort).
  useEffect(() => {
    if (bloqueio || enviado) return;
    const controle = new AbortController();
    const t = setTimeout(() => {
      pedidos.simular(JSON.parse(chaveDoCorpo), controle.signal).then(
        (resultado) => {
          setSimulacao({ chave: chaveDoCorpo, resultado });
          setUltimoResultado(resultado);
        },
        (erro: unknown) => {
          if (!controle.signal.aborted)
            setSimulacao({ chave: chaveDoCorpo, erro });
        },
      );
    }, 350);
    return () => {
      clearTimeout(t);
      controle.abort();
    };
  }, [chaveDoCorpo, bloqueio, enviado]);

  const simulacaoAtual = simulacao?.chave === chaveDoCorpo ? simulacao : null;
  const resultado =
    simulacaoAtual?.resultado ?? (bloqueio ? undefined : ultimoResultado);
  const erroDoServidor =
    !bloqueio && simulacaoAtual?.erro ? motivo(simulacaoAtual.erro) : "";
  // Erro que fala de cupom aparece junto do campo do cupom, não só no rodapé.
  const erroDeCupom = /cupom/i.test(erroDoServidor) ? erroDoServidor : "";

  const total = paraNumero(resultado?.totais.total);
  const pagoDigitado = carrinho.pagamentos.reduce((s, p) => s + p.valor, 0);
  // Arredonda em centavos: soma de números com vírgula deixa resíduos
  // (0,1 + 0,2 = 0,30000000000000004) que mostrariam "falta R$ 0,00".
  const falta = Math.round((total - (pagoDigitado - troco)) * 100) / 100;

  // Só registra o que o servidor acabou de simular sem erro: o total da tela
  // é exatamente o que será cobrado.
  const travado =
    enviando || !!bloqueio || !!erroDoServidor || !simulacaoAtual?.resultado;

  async function enviar() {
    if (travado) return;
    setEnviando(true);
    try {
      const pedido = await pedidos.criar(corpo);
      setEnviado(pedido);
      limpar();
      avisos.sucesso(
        `Pedido ${numeroPedido(pedido.id)} enviado para a cozinha`,
      );
    } catch (erro) {
      avisos.erro(motivo(erro));
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <>
        <main
          className={estilos.conteudo}
          style={{ paddingTop: 48, alignItems: "center", textAlign: "center" }}
        >
          <span
            className="ui-avatar ui-avatar--grande sc-enter"
            style={{
              background: "var(--status-pronto-bg)",
              color: "var(--status-pronto-fg)",
            }}
          >
            <Icone nome="check" tamanho={28} traco={2.6} />
          </span>
          <h1 className="ui-titulo-pagina">
            Pedido {numeroPedido(enviado.id)} enviado
          </h1>
          <p className="ui-suave">
            Total {moeda(enviado.totais.total)}
            {paraNumero(enviado.totais.saldo) > 0
              ? ` · falta receber ${moeda(enviado.totais.saldo)}`
              : " · pago"}
          </p>
        </main>
        <footer className={estilos.rodape}>
          <div
            className="sc-enter"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <Link
              to="/pedidos/novo"
              className="sc-btn sc-btn--ghost sc-btn--lg"
            >
              Novo pedido
            </Link>
            <Link
              to={`/pedidos/${enviado.id}`}
              className="sc-btn sc-btn--primary sc-btn--lg"
            >
              Ver pedido
            </Link>
          </div>
        </footer>
      </>
    );
  }

  const subtitulo = ehEntrega
    ? `Entrega · ${carrinho.cliente ? primeiroNome(carrinho.cliente.nome) : "sem cliente"}`
    : ehLocal
      ? `No local · ${carrinho.mesa ? `Mesa ${carrinho.mesa.numero}` : "sem mesa"}`
      : "Retirada no balcão";

  const itensSimulados = resultado?.itens;

  return (
    <>
      <header
        className={`${estilos.cabecalho} sc-screen-enter`}
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <Link
          to="/pedidos/novo"
          className="sc-btn sc-btn--ghost ui-botao-icone"
          aria-label="Voltar ao cardápio"
        >
          <Icone nome="voltar" />
        </Link>
        <div className="ui-coluna" style={{ gap: 0 }}>
          <h1 style={{ font: "600 26px/32px var(--font-display)" }}>
            Fechar pedido
          </h1>
          <span className="ui-texto-sm ui-suave">{subtitulo}</span>
        </div>
      </header>

      <main
        className={`${estilos.conteudo} sc-screen-enter`}
        style={{ gap: 14 }}
      >
        <section aria-labelledby="h-itens" className="ui-cartao">
          <div className="ui-linha ui-linha--entre">
            <h2 id="h-itens" className="ui-titulo-cartao">
              Itens
            </h2>
            <Link to="/pedidos/novo" className="ui-link">
              Adicionar mais
            </Link>
          </div>
          {carrinho.itens.length === 0 ? (
            <Vazio icone="cardapio">O pedido está vazio.</Vazio>
          ) : (
            carrinho.itens.map((item, indice) => {
              const extras = [
                ...item.adicionais.map((a) => `+ ${a.nome}`),
                item.observacao && `“${item.observacao}”`,
              ].filter(Boolean);
              const subtotal =
                itensSimulados?.[indice]?.subtotal ??
                precoUnitario(item) * item.quantidade;
              return (
                <div key={item.chave} className="ui-coluna" style={{ gap: 6 }}>
                  <div
                    className="ui-linha ui-linha--entre"
                    style={{ alignItems: "flex-start" }}
                  >
                    <div className="ui-coluna" style={{ gap: 0, minWidth: 0 }}>
                      <span style={{ font: "800 15px/22px var(--font-sans)" }}>
                        {item.nome}
                        {item.variacao ? ` · ${item.variacao.nome}` : ""}
                      </span>
                      {extras.length > 0 && (
                        <span
                          style={{ font: "600 13px/18px var(--font-sans)" }}
                          className="ui-suave"
                        >
                          {extras.join(" · ")}
                        </span>
                      )}
                    </div>
                    <span
                      className="sc-tnum"
                      style={{ font: "800 15px/22px var(--font-sans)" }}
                    >
                      {moeda(subtotal)}
                    </span>
                  </div>
                  <div className="ui-linha ui-linha--entre">
                    <div
                      role="group"
                      aria-label={`Quantidade de ${item.nome}`}
                      className="ui-quantidade"
                      style={{
                        transform: "scale(.9)",
                        transformOrigin: "left",
                      }}
                    >
                      <button
                        type="button"
                        aria-label={
                          item.quantidade === 1
                            ? `Remover ${item.nome}`
                            : "Diminuir"
                        }
                        onClick={() =>
                          item.quantidade === 1
                            ? removerItem(item.chave)
                            : atualizarItem(item.chave, {
                                quantidade: item.quantidade - 1,
                              })
                        }
                      >
                        <Icone
                          nome={item.quantidade === 1 ? "lixeira" : "menos"}
                          tamanho={18}
                        />
                      </button>
                      <span aria-live="polite">{item.quantidade}</span>
                      <button
                        type="button"
                        aria-label="Aumentar"
                        disabled={item.quantidade >= 99}
                        onClick={() =>
                          atualizarItem(item.chave, {
                            quantidade: item.quantidade + 1,
                          })
                        }
                      >
                        <Icone nome="mais" tamanho={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section aria-labelledby="h-onde" className="ui-cartao">
          <h2 id="h-onde" className="ui-titulo-cartao">
            Onde o cliente vai comer?
          </h2>
          <Segmentado<TipoAtendimento>
            rotulo="Tipo de atendimento"
            valor={carrinho.atendimento}
            aoMudar={(atendimento) => alterar({ atendimento })}
            opcoes={[
              { valor: "CONSUMO_LOCAL", rotulo: "No local" },
              { valor: "RETIRADA", rotulo: "Retirada" },
              { valor: "ENTREGA", rotulo: "Entrega" },
            ]}
          />
          {ehLocal && (
            <div className="ui-linha ui-linha--entre ui-bloco">
              <span style={{ font: "700 15px/20px var(--font-sans)" }}>
                {carrinho.mesa
                  ? `Mesa ${carrinho.mesa.numero}`
                  : "Nenhuma mesa escolhida"}
              </span>
              <Botao
                variante="fantasma"
                onClick={() => setFolha("mesa")}
                style={{ minHeight: 40, background: "var(--surface-inset)" }}
              >
                {carrinho.mesa ? "Trocar mesa" : "Escolher mesa"}
              </Botao>
            </div>
          )}
          {ehEntrega && (
            <div className="ui-coluna sc-enter">
              <p className="ui-texto-sm">
                Entrega precisa de cliente cadastrado com endereço. A taxa de
                entrega entra no total.
              </p>
              <Campo rotulo="Taxa de entrega (R$)">
                <input
                  inputMode="decimal"
                  value={taxaDigitada}
                  onChange={(e) => setTaxaDigitada(e.target.value)}
                  onBlur={() => {
                    const n = numeroDoCampo(taxaDigitada);
                    const taxa =
                      Number.isFinite(n) && n >= 0
                        ? Math.round(n * 100) / 100
                        : 0;
                    alterar({ taxaEntrega: taxa });
                    setTaxaDigitada(campoDeDinheiro(taxa));
                  }}
                />
              </Campo>
              {carrinho.cliente && (
                <EnderecoDeEntrega
                  temPadrao={carrinho.cliente.temEndereco}
                  endereco={carrinho.endereco}
                  aoMudar={(endereco) => alterar({ endereco })}
                />
              )}
            </div>
          )}
        </section>

        <section aria-labelledby="h-cliente" className="ui-cartao">
          <div className="ui-linha ui-linha--entre">
            <h2 id="h-cliente" className="ui-titulo-cartao">
              Cliente{" "}
              {carrinho.canal === "BALCAO" && !ehEntrega && (
                <span className="ui-texto-sm ui-suave">(opcional)</span>
              )}
            </h2>
            <button
              type="button"
              className="ui-link"
              onClick={() => setFolha("cliente")}
            >
              {carrinho.cliente ? "Trocar" : "Escolher cliente"}
            </button>
          </div>
          {carrinho.cliente && (
            <span style={{ font: "700 15px/20px var(--font-sans)" }}>
              {carrinho.cliente.nome}
              {!carrinho.cliente.temEndereco && ehEntrega && (
                <span className="ui-texto-sm ui-suave">
                  {" "}
                  · sem endereço no cadastro
                </span>
              )}
            </span>
          )}
        </section>

        <section aria-labelledby="h-pag" className="ui-cartao">
          <div className="ui-linha ui-linha--entre">
            <h2 id="h-pag" className="ui-titulo-cartao">
              Pagamento
            </h2>
            {resultado && (
              <span
                className={`sc-badge ${falta > 0 ? "sc-badge--preparo" : "sc-badge--pronto"}`}
                aria-live="polite"
              >
                {falta > 0
                  ? `Falta ${moeda(falta)}`
                  : troco > 0
                    ? `Troco ${moeda(troco)}`
                    : "Tudo pago"}
              </span>
            )}
          </div>
          {carrinho.pagamentos.length === 0 && (
            <p className="ui-texto-sm ui-suave">
              Nenhum pagamento lançado. Dá para receber depois, no detalhe do
              pedido.
            </p>
          )}
          {carrinho.pagamentos.map((p) => (
            <LinhaDePagamento
              key={p.chave}
              formas={formas.dados?.dados ?? []}
              formaPagamentoId={p.formaPagamentoId}
              valor={p.valor}
              aoMudar={(parcial) =>
                alterar({
                  pagamentos: carrinho.pagamentos.map((x) =>
                    x.chave === p.chave ? { ...x, ...parcial } : x,
                  ),
                })
              }
              aoRemover={() =>
                alterar({
                  pagamentos: carrinho.pagamentos.filter(
                    (x) => x.chave !== p.chave,
                  ),
                })
              }
            />
          ))}
          {formas.dados && (
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              style={{ alignSelf: "flex-start", minHeight: 44, fontSize: 14 }}
              onClick={() =>
                alterar({
                  pagamentos: [
                    ...carrinho.pagamentos,
                    {
                      chave: novaChave(),
                      formaPagamentoId: proximaForma(),
                      valor: Math.max(0, falta > 0 ? falta : 0),
                    },
                  ],
                })
              }
            >
              <Icone nome="mais" tamanho={18} />
              {carrinho.pagamentos.length === 0
                ? "Lançar pagamento"
                : "Dividir com outra forma"}
            </button>
          )}
        </section>

        <section aria-label="Cupom e observações" className="ui-cartao">
          <div className="ui-linha" style={{ alignItems: "flex-end" }}>
            <Campo
              rotulo="Cupom"
              erro={erroDeCupom || undefined}
              ajuda={
                !carrinho.cliente
                  ? "Cupom vale para cliente cadastrado."
                  : undefined
              }
              className="ui-coluna"
            >
              <input
                autoCapitalize="characters"
                placeholder="Ex.: BEMVINDO10"
                value={cupomDigitado}
                onChange={(e) => setCupomDigitado(e.target.value.toUpperCase())}
                style={{ textTransform: "uppercase" }}
              />
            </Campo>
          </div>
          <div className="ui-linha">
            {carrinho.cupom ? (
              <>
                <span className="sc-promo">{carrinho.cupom}</span>
                <span className="ui-texto-sm">
                  {resultado?.cupom
                    ? "cupom aplicado"
                    : erroDeCupom
                      ? "não aplicado"
                      : "conferindo…"}
                </span>
                <button
                  type="button"
                  className="ui-link"
                  onClick={() => {
                    alterar({ cupom: "" });
                    setCupomDigitado("");
                    avisos.sucesso("Cupom removido");
                  }}
                >
                  Remover
                </button>
              </>
            ) : (
              <Botao
                variante="fantasma"
                disabled={!cupomDigitado.trim() || !carrinho.cliente}
                onClick={() => alterar({ cupom: cupomDigitado.trim() })}
              >
                <Icone nome="cupom" />
                Aplicar cupom
              </Botao>
            )}
          </div>
          <Campo rotulo="Observações do pedido (opcional)">
            <textarea
              rows={2}
              maxLength={500}
              value={carrinho.observacoes}
              onChange={(e) => alterar({ observacoes: e.target.value })}
            />
          </Campo>
        </section>

        <section
          aria-label="Totais"
          className="ui-cartao"
          style={{ gap: 6 }}
          aria-busy={!simulacaoAtual && !bloqueio}
        >
          {resultado ? (
            <>
              <div className="ui-valor ui-valor--suave">
                <span>Subtotal</span>
                <span className="sc-tnum">
                  {moeda(resultado.totais.subtotalItens)}
                </span>
              </div>
              {paraNumero(resultado.totais.taxaEntrega) > 0 && (
                <div className="ui-valor ui-valor--suave">
                  <span>Taxa de entrega</span>
                  <span className="sc-tnum">
                    {moeda(resultado.totais.taxaEntrega)}
                  </span>
                </div>
              )}
              {paraNumero(resultado.totais.descontoCupom) > 0 && (
                <div className="ui-valor ui-valor--suave">
                  <span>
                    Desconto
                    {resultado.cupom?.tipoDesconto === "PERCENTUAL"
                      ? ` (${paraNumero(resultado.cupom.valorDesconto)}%)`
                      : ""}
                  </span>
                  <span className="sc-tnum">
                    − {moeda(resultado.totais.descontoCupom)}
                  </span>
                </div>
              )}
              <div className="ui-valor ui-valor--total">
                <span>Total</span>
                <span
                  className="sc-price"
                  style={{ fontSize: 22, lineHeight: "28px" }}
                >
                  {moeda(resultado.totais.total)}
                </span>
              </div>
            </>
          ) : (
            <div className="sc-skeleton" style={{ height: 72 }} />
          )}
        </section>
      </main>

      <footer className={estilos.rodape}>
        {(bloqueio || erroDoServidor) && !enviando && (
          <span
            className="ui-erro"
            style={{ textAlign: "center" }}
            role="alert"
          >
            {bloqueio || erroDoServidor}
          </span>
        )}
        <Botao
          variante="primario"
          grande
          bloco
          disabled={travado}
          carregando={enviando}
          textoCarregando="Enviando…"
          onClick={enviar}
        >
          Enviar para a cozinha
        </Botao>
      </footer>

      <FolhaMesa
        aberta={folha === "mesa"}
        mesaAtual={carrinho.mesa?.id}
        aoFechar={() => setFolha(null)}
        aoEscolher={(m) =>
          alterar({ mesa: m && { id: m.id, numero: m.numero } })
        }
      />
      <FolhaCliente
        aberta={folha === "cliente"}
        exigirEndereco={ehEntrega}
        aoFechar={() => setFolha(null)}
        aoRemover={
          carrinho.cliente
            ? () => alterar({ cliente: null, cupom: "" })
            : undefined
        }
        aoEscolher={(c) =>
          alterar({
            cliente: {
              id: c.id,
              nome: c.nome,
              telefone: c.telefone,
              temEndereco: temEnderecoCompleto(c),
            },
            endereco: null,
          })
        }
      />
    </>
  );
}

function LinhaDePagamento({
  formas,
  formaPagamentoId,
  valor,
  aoMudar,
  aoRemover,
}: {
  formas: { id: number; nome: string }[];
  formaPagamentoId: number;
  valor: number;
  aoMudar(parcial: { formaPagamentoId?: number; valor?: number }): void;
  aoRemover(): void;
}) {
  const [texto, setTexto] = useState(campoDeDinheiro(valor));
  return (
    <div className="ui-linha ui-bloco" style={{ padding: 8, gap: 8 }}>
      <select
        className="sc-input"
        style={{ flex: 1.2, minWidth: 0 }}
        value={formaPagamentoId}
        aria-label="Forma de pagamento"
        onChange={(e) => aoMudar({ formaPagamentoId: Number(e.target.value) })}
      >
        {formas.map((f) => (
          <option key={f.id} value={f.id}>
            {rotuloFormaPagamento(f.nome)}
          </option>
        ))}
      </select>
      <input
        className="sc-input sc-tnum"
        style={{ flex: 1, minWidth: 0 }}
        inputMode="decimal"
        aria-label="Valor recebido (R$)"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          const n = numeroDoCampo(e.target.value);
          aoMudar({
            valor: Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0,
          });
        }}
        onBlur={() => setTexto(campoDeDinheiro(valor))}
      />
      <button
        type="button"
        className="sc-btn sc-btn--ghost ui-botao-icone"
        aria-label="Remover pagamento"
        onClick={aoRemover}
      >
        <Icone nome="lixeira" tamanho={18} />
      </button>
    </div>
  );
}

function EnderecoDeEntrega({
  temPadrao,
  endereco,
  aoMudar,
}: {
  temPadrao: boolean;
  endereco: Endereco | null;
  aoMudar(endereco: Endereco | null): void;
}) {
  const [rascunho, setRascunho] = useState<Endereco>(
    endereco ?? ENDERECO_VAZIO,
  );
  const outro = endereco !== null || !temPadrao;
  const completo = (e: Endereco) => Object.values(e).every((v) => v.trim());

  function mudar(campo: keyof Endereco, valor: string) {
    const novo = { ...rascunho, [campo]: valor };
    setRascunho(novo);
    aoMudar(completo(novo) ? novo : temPadrao ? novo : null);
  }

  return (
    <div className="ui-coluna">
      {temPadrao && (
        <label className="ui-opcao">
          <input
            type="checkbox"
            checked={outro}
            onChange={(e) => aoMudar(e.target.checked ? rascunho : null)}
          />
          Entregar em outro endereço
        </label>
      )}
      {outro && (
        <div className="ui-form">
          <Campo rotulo="Rua / avenida" className="ui-form__inteiro">
            <input
              value={rascunho.logradouro}
              onChange={(e) => mudar("logradouro", e.target.value)}
            />
          </Campo>
          <Campo rotulo="Número">
            <input
              value={rascunho.numero}
              onChange={(e) => mudar("numero", e.target.value)}
            />
          </Campo>
          <Campo rotulo="Bairro">
            <input
              value={rascunho.bairro}
              onChange={(e) => mudar("bairro", e.target.value)}
            />
          </Campo>
          <Campo rotulo="Cidade">
            <input
              value={rascunho.cidade}
              onChange={(e) => mudar("cidade", e.target.value)}
            />
          </Campo>
          <Campo rotulo="CEP">
            <input
              inputMode="numeric"
              value={rascunho.cep}
              onChange={(e) => mudar("cep", e.target.value)}
            />
          </Campo>
        </div>
      )}
    </div>
  );
}
