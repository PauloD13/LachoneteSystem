import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { useAvisos } from "../../hooks/useAvisos";
import { useCarrinho } from "../../hooks/useCarrinho";
import { useConsulta } from "../../hooks/useConsulta";
import { categorias, combos, mesas, produtos } from "../../services/cadastros";
import { pedidos } from "../../services/pedidos";
import { Segmentado } from "../../components/ui/Segmentado";
import { Chip } from "../../components/ui/Chip";
import { Icone } from "../../components/ui/Icone";
import { iconeDaCategoria } from "../../lib/icones";
import { Miniatura } from "../../components/ui/Miniatura";
import { Esqueleto, ErroAoCarregar, Vazio } from "../../components/ui/Estados";
import {
  FolhaDoItem,
  type ItemDoCardapio,
} from "../../components/pedido/FolhaDoItem";
import { FolhaCliente } from "../../components/pedido/FolhaCliente";
import { FolhaMesa } from "../../components/pedido/FolhaMesa";
import { temEnderecoCompleto } from "../../lib/clientes";
import { moeda, paraNumero, primeiroNome } from "../../lib/formatadores";
import { STATUS_EM_ABERTO } from "../../lib/status";
import type { Canal } from "../../types/dominio";
import estilos from "./Atendente.module.css";

const COMBOS = "combos";

/** Tela 3 — Novo pedido: canal, mesa, cliente e o cardápio. */
export function NovoPedidoPage() {
  const { usuario } = useAuth();
  const avisos = useAvisos();
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const { carrinho, alterar, adicionar, quantidadeTotal, subtotalEstimado } =
    useCarrinho();

  const [categoria, setCategoria] = useState<number | typeof COMBOS | null>(
    null,
  );
  const [busca, setBusca] = useState("");
  const [itemAberto, setItemAberto] = useState<ItemDoCardapio | null>(null);
  const [folha, setFolha] = useState<"cliente" | "mesa" | null>(null);
  const [pulo, setPulo] = useState(false);

  // Vindo da tela Mesas: /pedidos/novo?mesa=7 já abre o pedido na mesa.
  const mesaDaUrl = Number(parametros.get("mesa")) || null;
  useEffect(() => {
    if (!mesaDaUrl) return;
    const controle = new AbortController();
    mesas
      .buscar(mesaDaUrl, controle.signal)
      .then((m) => {
        alterar({
          mesa: { id: m.id, numero: m.numero },
          atendimento: "CONSUMO_LOCAL",
        });
        // Limpa a URL para um F5 não pôr a mesa de volta depois de trocada.
        setParametros({}, { replace: true });
      })
      .catch(() => {});
    return () => controle.abort();
  }, [mesaDaUrl, alterar, setParametros]);

  // Na ordem de cadastro (Lanches primeiro, como no enunciado), não alfabética.
  const listaCategorias = useConsulta("novo:categorias", async (sinal) => {
    const r = await categorias.listar({ tamanhoPagina: 100 }, sinal);
    return { ...r, dados: [...r.dados].sort((a, b) => a.id - b.id) };
  });
  const categoriaAtual =
    categoria ?? listaCategorias.dados?.dados[0]?.id ?? null;
  const termo = busca.trim();

  // A busca ignora a categoria escolhida e procura no cardápio todo. Combos e
  // produtos viram o mesmo formato (ItemDoCardapio) para a mesma lista.
  const cardapio = useConsulta(
    `novo:cardapio:${termo ? `busca:${termo}` : categoriaAtual}`,
    async (sinal): Promise<ItemDoCardapio[]> => {
      if (!termo && categoriaAtual === COMBOS) {
        const r = await combos.listar(
          { ativo: true, tamanhoPagina: 100 },
          sinal,
        );
        return r.dados.map((c) => ({
          itemVendavelId: c.id,
          nome: c.nome,
          tipo: "COMBO",
          descricao:
            c.descricao ??
            c.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(", "),
          preco: paraNumero(c.preco),
          // Soma dos itens avulsos: mostra quanto o combo economiza.
          precoCheio: c.itens.reduce(
            (s, i) => s + paraNumero(i.precoIndividual) * i.quantidade,
            0,
          ),
          totalVariacoes: 0,
        }));
      }
      if (!termo && categoriaAtual === null) return [];
      const r = await produtos.listar(
        {
          ativo: true,
          tamanhoPagina: 100,
          ...(termo
            ? { busca: termo }
            : { categoriaId: categoriaAtual as number }),
        },
        sinal,
      );
      return r.dados.map((p) => ({
        itemVendavelId: p.id,
        nome: p.nome,
        tipo: "PRODUTO",
        descricao: p.descricao,
        categoriaNome: p.categoriaNome,
        preco: paraNumero(p.precoVigente),
        precoCheio: paraNumero(p.preco),
        totalVariacoes: p.totalVariacoes,
        fotoVersao: p.fotoVersao,
      }));
    },
  );

  // Só o total interessa (contador do cabeçalho): uma linha basta.
  const emAberto = useConsulta("novo:abertos", (sinal) =>
    pedidos.listar({ status: STATUS_EM_ABERTO, tamanhoPagina: 1 }, sinal),
  );

  const nomeDaCategoria = termo
    ? `Resultados para “${termo}”`
    : categoriaAtual === COMBOS
      ? "Combos"
      : (listaCategorias.dados?.dados.find((c) => c.id === categoriaAtual)
          ?.nome ?? "");

  // A API só exige cliente no app e na entrega (regra 4.1); a tela pede também
  // por telefone, para haver a quem ligar de volta. A trava fica no fechamento.
  const clienteObrigatorio = carrinho.canal !== "BALCAO";

  function colocarNoPedido(item: Parameters<typeof adicionar>[0]) {
    adicionar(item);
    setPulo((p) => !p); // alterna para reiniciar a animação da sacola
    avisos.sucesso(`${item.quantidade}× ${item.nome} adicionado`);
  }

  function maisRapido(item: ItemDoCardapio) {
    // Com variação (tamanho), o "+" abre a folha: o tamanho é obrigatório.
    if (item.totalVariacoes > 0) {
      setItemAberto(item);
      return;
    }
    colocarNoPedido({
      itemVendavelId: item.itemVendavelId,
      nome: item.nome,
      tipo: item.tipo,
      categoriaNome: item.categoriaNome,
      precoBase: item.preco,
      variacao: null,
      adicionais: [],
      observacao: "",
      quantidade: 1,
    });
  }

  return (
    <>
      <header className={estilos.cabecalho}>
        <div className="ui-linha ui-linha--entre">
          <div className="ui-coluna" style={{ gap: 0 }}>
            <span className="ui-texto-sm ui-suave">
              Atendente: {primeiroNome(usuario?.nome)}
            </span>
            <h1 className="ui-titulo-pagina">Novo pedido</h1>
          </div>
          <Link
            to="/pedidos"
            className="sc-btn sc-btn--ghost"
            aria-label={`Pedidos em aberto: ${emAberto.dados?.paginacao.total ?? 0}`}
            style={{ minWidth: 44, padding: "10px 14px" }}
          >
            <Icone nome="pedidos" />
            <span>{emAberto.dados?.paginacao.total ?? "–"}</span>
          </Link>
        </div>

        <Segmentado<Canal>
          rotulo="Canal do pedido"
          valor={carrinho.canal}
          aoMudar={(canal) => alterar({ canal })}
          opcoes={[
            { valor: "BALCAO", rotulo: "Balcão" },
            { valor: "TELEFONE", rotulo: "Telefone" },
            { valor: "APP", rotulo: "App" },
          ]}
        />

        <div className="ui-linha ui-linha--quebra">
          <Chip
            onClick={() => setFolha("mesa")}
            style={{ gap: 6 }}
            aria-pressed={undefined}
          >
            <Icone nome="mesa" tamanho={18} />
            {carrinho.mesa ? `Mesa ${carrinho.mesa.numero}` : "Sem mesa"}
          </Chip>
          <Chip
            onClick={() => setFolha("cliente")}
            style={{
              gap: 6,
              color: carrinho.cliente ? undefined : "var(--ink-muted)",
            }}
            aria-pressed={undefined}
          >
            <Icone nome="pessoa" tamanho={18} />
            {carrinho.cliente
              ? primeiroNome(carrinho.cliente.nome)
              : clienteObrigatorio
                ? "Escolher cliente *"
                : "Cliente (opcional)"}
          </Chip>
        </div>

        <label className="ui-busca">
          <span className="sr-only">Buscar no cardápio</span>
          <Icone nome="busca" />
          <input
            className="sc-input"
            type="search"
            placeholder="Buscar no cardápio"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>

        {!termo && (
          <div className="ui-faixa" role="group" aria-label="Categorias">
            {listaCategorias.dados?.dados.map((c) => (
              <Chip
                key={c.id}
                selecionado={c.id === categoriaAtual}
                onClick={() => setCategoria(c.id)}
              >
                {c.nome}
              </Chip>
            ))}
            {listaCategorias.dados && (
              <Chip
                selecionado={categoriaAtual === COMBOS}
                onClick={() => setCategoria(COMBOS)}
              >
                Combos
              </Chip>
            )}
          </div>
        )}
      </header>

      <main className={estilos.conteudo} style={{ gap: 12 }}>
        <h2 className="ui-titulo-secao">{nomeDaCategoria}</h2>
        {cardapio.erro || listaCategorias.erro ? (
          <ErroAoCarregar
            erro={cardapio.erro ?? listaCategorias.erro}
            aoTentarDeNovo={() => {
              listaCategorias.recarregar();
              cardapio.recarregar();
            }}
          />
        ) : cardapio.carregando && !cardapio.dados ? (
          <Esqueleto linhas={4} altura={92} rotulo="Carregando produtos" />
        ) : cardapio.dados?.length === 0 ? (
          <Vazio icone="cardapio">
            {termo
              ? "Nada no cardápio com esse nome."
              : "Nenhum item ativo nesta categoria."}
          </Vazio>
        ) : (
          <div
            className="ui-coluna sc-screen-enter"
            key={String(categoriaAtual) + termo}
          >
            {cardapio.dados?.map((p) => (
              <article key={p.itemVendavelId} className={estilos.produto}>
                <button
                  type="button"
                  className={estilos.produtoAbrir}
                  onClick={() => setItemAberto(p)}
                >
                  <Miniatura
                    produtoId={p.itemVendavelId}
                    fotoVersao={p.fotoVersao}
                    icone={
                      p.tipo === "COMBO"
                        ? "combo"
                        : iconeDaCategoria(p.categoriaNome)
                    }
                  />
                  <span className={estilos.produtoTexto}>
                    <span className={estilos.produtoNome}>{p.nome}</span>
                    {p.descricao && (
                      <span
                        className={`ui-texto-sm ui-suave ${estilos.reticencias}`}
                      >
                        {p.descricao}
                      </span>
                    )}
                    <span className="ui-linha">
                      {p.precoCheio !== undefined && p.precoCheio > p.preco && (
                        <span
                          className="sc-price sc-price--strike"
                          style={{ fontSize: 14 }}
                        >
                          {moeda(p.precoCheio)}
                        </span>
                      )}
                      <span className="sc-price" style={{ fontSize: 16 }}>
                        {moeda(p.preco)}
                      </span>
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`sc-btn sc-btn--primary ${estilos.botaoMais}`}
                  aria-label={`Adicionar ${p.nome}`}
                  onClick={() => maisRapido(p)}
                >
                  <Icone nome="mais" tamanho={22} traco={2.4} />
                </button>
              </article>
            ))}
          </div>
        )}
      </main>

      <div className={estilos.barraPedido}>
        <button
          type="button"
          className="sc-btn sc-btn--primary sc-btn--lg sc-btn--block"
          style={{ justifyContent: "space-between" }}
          disabled={quantidadeTotal === 0}
          onClick={() => navegar("/pedidos/novo/fechar")}
        >
          <span className="ui-linha" style={{ gap: 10 }}>
            <span
              className={pulo ? "sc-bump-a" : "sc-bump-b"}
              style={{
                display: "inline-grid",
                placeItems: "center",
                minWidth: 28,
                height: 28,
                padding: "0 6px",
                borderRadius: 999,
                background: "var(--on-brand)",
                color: "var(--brand)",
                font: "800 14px/1 var(--font-sans)",
              }}
            >
              {quantidadeTotal}
            </span>
            Ver pedido
          </span>
          <span className="sc-tnum">{moeda(subtotalEstimado)}</span>
        </button>
      </div>

      <FolhaDoItem
        item={itemAberto}
        aoFechar={() => setItemAberto(null)}
        aoAdicionar={(item) => {
          colocarNoPedido(item);
          setItemAberto(null);
        }}
      />
      <FolhaMesa
        aberta={folha === "mesa"}
        mesaAtual={carrinho.mesa?.id}
        aoFechar={() => setFolha(null)}
        aoEscolher={(m) =>
          alterar(
            m
              ? {
                  mesa: { id: m.id, numero: m.numero },
                  atendimento: "CONSUMO_LOCAL",
                }
              : {
                  mesa: null,
                  atendimento:
                    carrinho.atendimento === "CONSUMO_LOCAL"
                      ? "RETIRADA"
                      : carrinho.atendimento,
                },
          )
        }
      />
      <FolhaCliente
        aberta={folha === "cliente"}
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
          })
        }
      />
    </>
  );
}
