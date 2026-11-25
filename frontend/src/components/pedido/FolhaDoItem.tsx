import { useState } from "react";
import { Folha } from "../ui/Folha";
import { Chip } from "../ui/Chip";
import { Campo } from "../ui/Campo";
import { Icone } from "../ui/Icone";
import { Esqueleto, ErroAoCarregar } from "../ui/Estados";
import { useConsulta } from "../../hooks/useConsulta";
import {
  adicionais as servicoAdicionais,
  variacoes,
} from "../../services/cadastros";
import { moeda, paraNumero } from "../../lib/formatadores";
import type { ItemDoCarrinho } from "../../contexts/carrinho-contexto";

/** O que a folha precisa saber do item escolhido no cardápio. */
export interface ItemDoCardapio {
  itemVendavelId: number;
  nome: string;
  tipo: "PRODUTO" | "COMBO";
  descricao: string | null;
  categoriaNome?: string;
  /** Preço de hoje (com promoção, se houver). */
  preco: number;
  precoCheio?: number;
  totalVariacoes: number;
}

interface Props {
  item: ItemDoCardapio | null;
  aoFechar(): void;
  aoAdicionar(item: Omit<ItemDoCarrinho, "chave">): void;
}

// "Ponto da carne" é um atalho: preenche a observação do item (o banco não
// tem um campo para isso — decisão registrada no PR do frontend).
const PONTOS = ["Mal passado", "Ao ponto", "Bem passado"];

function ehLanche(categoria?: string) {
  return (categoria ?? "").toLowerCase().includes("lanche");
}

/** Tela 4 — Item do pedido (folha sobre o cardápio). */
export function FolhaDoItem({ item, aoFechar, aoAdicionar }: Props) {
  return (
    <Folha
      aberta={item !== null}
      aoFechar={aoFechar}
      titulo={item?.nome ?? ""}
      subtitulo={
        item && (
          <>
            {item.descricao && (
              <p className="ui-texto-sm ui-suave">{item.descricao}</p>
            )}
            <span className="ui-linha">
              {item.precoCheio !== undefined &&
                item.precoCheio > item.preco && (
                  <span className="sc-price sc-price--strike">
                    {moeda(item.precoCheio)}
                  </span>
                )}
              <span className="sc-price">
                {item.totalVariacoes > 0 ? "a partir de " : ""}
                {moeda(item.preco)}
              </span>
            </span>
          </>
        )
      }
    >
      {/* key: estado zerado a cada item aberto */}
      {item && (
        <Escolhas
          key={item.itemVendavelId}
          item={item}
          aoAdicionar={aoAdicionar}
        />
      )}
    </Folha>
  );
}

function Escolhas({
  item,
  aoAdicionar,
}: {
  item: ItemDoCardapio;
  aoAdicionar: Props["aoAdicionar"];
}) {
  const [variacaoId, setVariacaoId] = useState<number | null>(null);
  const [marcados, setMarcados] = useState<number[]>([]);
  const [ponto, setPonto] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [faltaTamanho, setFaltaTamanho] = useState(false);

  const opcoes = useConsulta(`item:${item.itemVendavelId}`, async (sinal) => {
    const [vars, adics] = await Promise.all([
      item.tipo === "PRODUTO" && item.totalVariacoes > 0
        ? variacoes.listar(item.itemVendavelId, sinal)
        : Promise.resolve([]),
      servicoAdicionais.listar(
        {
          itemVendavelId: item.itemVendavelId,
          ativo: true,
          tamanhoPagina: 100,
        },
        sinal,
      ),
    ]);
    return { variacoes: vars, adicionais: adics.dados };
  });

  if (opcoes.erro) {
    return (
      <ErroAoCarregar erro={opcoes.erro} aoTentarDeNovo={opcoes.recarregar} />
    );
  }
  if (!opcoes.dados)
    return <Esqueleto linhas={3} altura={48} rotulo="Carregando opções" />;

  const { variacoes: listaVariacoes, adicionais: listaAdicionais } =
    opcoes.dados;
  const variacao = listaVariacoes.find((v) => v.id === variacaoId) ?? null;
  const escolhidos = listaAdicionais.filter((a) => marcados.includes(a.id));
  const unitario =
    item.preco +
    paraNumero(variacao?.precoAdicional) +
    escolhidos.reduce((s, a) => s + paraNumero(a.preco), 0);
  const precisaTamanho = listaVariacoes.length > 0;

  const observacaoFinal = [ponto, observacao.trim()]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 200);

  function adicionar() {
    if (precisaTamanho && !variacao) {
      setFaltaTamanho(true);
      return;
    }
    aoAdicionar({
      itemVendavelId: item.itemVendavelId,
      nome: item.nome,
      tipo: item.tipo,
      categoriaNome: item.categoriaNome,
      precoBase: item.preco,
      variacao: variacao && {
        id: variacao.id,
        nome: variacao.nome,
        precoAdicional: paraNumero(variacao.precoAdicional),
      },
      adicionais: escolhidos.map((a) => ({
        id: a.id,
        nome: a.nome,
        preco: paraNumero(a.preco),
      })),
      observacao: observacaoFinal,
      quantidade,
    });
  }

  return (
    <>
      {precisaTamanho && (
        <fieldset
          className={`ui-grupo ${faltaTamanho && !variacao ? "sc-shake" : ""}`}
        >
          <legend>
            Tamanho
            <span
              className="sc-badge"
              style={{ background: "var(--surface-300)", color: "var(--ink)" }}
            >
              Obrigatório
            </span>
          </legend>
          <div className="ui-linha ui-linha--quebra">
            {listaVariacoes.map((v) => (
              <Chip
                key={v.id}
                selecionado={v.id === variacaoId}
                onClick={() => {
                  setVariacaoId(v.id);
                  setFaltaTamanho(false);
                }}
              >
                {v.nome}
                {paraNumero(v.precoAdicional) > 0 &&
                  ` · + ${moeda(v.precoAdicional)}`}
              </Chip>
            ))}
          </div>
          {faltaTamanho && !variacao && (
            <p className="ui-erro" role="alert" style={{ marginTop: 8 }}>
              Escolha o tamanho para adicionar.
            </p>
          )}
        </fieldset>
      )}

      {ehLanche(item.categoriaNome) && (
        <fieldset className="ui-grupo">
          <legend>
            Ponto da carne{" "}
            <span className="ui-texto-sm ui-suave">opcional</span>
          </legend>
          <div className="ui-linha ui-linha--quebra">
            {PONTOS.map((p) => (
              <Chip
                key={p}
                selecionado={ponto === p}
                onClick={() => setPonto(ponto === p ? null : p)}
              >
                {p}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      {listaAdicionais.length > 0 && (
        <fieldset className="ui-grupo">
          <legend>
            Adicionais <span className="ui-texto-sm ui-suave">opcional</span>
          </legend>
          <div className="ui-coluna" style={{ gap: 6 }}>
            {listaAdicionais.map((a) => (
              <label key={a.id} className="ui-opcao">
                <input
                  type="checkbox"
                  checked={marcados.includes(a.id)}
                  onChange={(e) =>
                    setMarcados((m) =>
                      e.target.checked
                        ? [...m, a.id]
                        : m.filter((id) => id !== a.id),
                    )
                  }
                />
                <span style={{ flex: 1 }}>{a.nome}</span>
                <span className="sc-tnum ui-suave">+ {moeda(a.preco)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <Campo
        rotulo="Observação"
        ajuda={ponto ? `Vai junto: “${ponto}”.` : undefined}
      >
        <input
          maxLength={150}
          placeholder="Ex.: sem cebola, molho à parte"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </Campo>

      <div
        className="ui-folha__rodape"
        style={{
          margin: "auto -20px -16px",
          position: "sticky",
          bottom: -16,
          background: "var(--surface-200)",
        }}
      >
        <div role="group" aria-label="Quantidade" className="ui-quantidade">
          <button
            type="button"
            aria-label="Diminuir"
            disabled={quantidade <= 1}
            onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
          >
            <Icone nome="menos" />
          </button>
          <span aria-live="polite">{quantidade}</span>
          <button
            type="button"
            aria-label="Aumentar"
            disabled={quantidade >= 99}
            onClick={() => setQuantidade((q) => Math.min(99, q + 1))}
          >
            <Icone nome="mais" />
          </button>
        </div>
        <button
          type="button"
          className="sc-btn sc-btn--primary sc-btn--lg"
          style={{
            flex: 1,
            justifyContent: "space-between",
            padding: "16px 20px",
          }}
          onClick={adicionar}
        >
          <span>Adicionar</span>
          <span className="sc-tnum">{moeda(unitario * quantidade)}</span>
        </button>
      </div>
    </>
  );
}
