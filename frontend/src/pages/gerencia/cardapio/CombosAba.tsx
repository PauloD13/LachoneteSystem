import { useState, type FormEvent } from "react";
import { useConsulta } from "../../../hooks/useConsulta";
import { useAcao } from "../../../hooks/useAcao";
import { useSelecaoNaLista } from "../../../hooks/useSelecaoNaLista";
import { combos, produtos } from "../../../services/cadastros";
import { Botao } from "../../../components/ui/Botao";
import { Campo } from "../../../components/ui/Campo";
import { Icone } from "../../../components/ui/Icone";
import {
  ErroAoCarregar,
  Esqueleto,
  Vazio,
} from "../../../components/ui/Estados";
import {
  campoDeDinheiro,
  numeroDoCampo,
  textoOuNulo,
} from "../../../lib/formularios";
import { moeda, paraNumero } from "../../../lib/formatadores";
import type { Combo } from "../../../types/dominio";

/** Aba Combos: produtos reunidos com preço próprio. */
export function CombosAba({
  novo,
  aoAbrirNovo,
}: {
  novo: boolean;
  aoAbrirNovo(v: boolean): void;
}) {
  const lista = useConsulta("cardapio:combos", (s) =>
    combos.listar({ tamanhoPagina: 100 }, s),
  );
  const selecao = useSelecaoNaLista(lista.dados?.dados, lista.carregando);
  const atual = novo ? null : selecao.atual;

  return (
    <div className="ui-paineis">
      <section
        aria-label="Combos"
        className="ui-cartao ui-painel-metade"
        style={{ gap: 8 }}
      >
        {lista.erro ? (
          <ErroAoCarregar erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
        ) : !lista.dados ? (
          <Esqueleto linhas={3} altura={48} />
        ) : lista.dados.dados.length === 0 ? (
          <Vazio icone="combo">Nenhum combo ainda. Use “Novo combo”.</Vazio>
        ) : (
          lista.dados.dados.map((c) => {
            const cheio = c.itens.reduce(
              (s, i) => s + paraNumero(i.precoIndividual) * i.quantidade,
              0,
            );
            return (
              <button
                key={c.id}
                type="button"
                className="ui-item-lista"
                aria-current={atual?.id === c.id}
                onClick={() => {
                  aoAbrirNovo(false);
                  selecao.selecionar(c.id);
                }}
              >
                <span
                  className="ui-coluna"
                  style={{ gap: 0, flex: 1, minWidth: 0 }}
                >
                  <span style={{ fontWeight: 800 }}>{c.nome}</span>
                  <span className="ui-texto-sm ui-suave">
                    {c.itens
                      .map((i) => `${i.quantidade}× ${i.nome}`)
                      .join(", ")}
                  </span>
                </span>
                <span
                  className="ui-coluna"
                  style={{ gap: 0, alignItems: "flex-end" }}
                >
                  <span className="sc-tnum">{moeda(c.preco)}</span>
                  {cheio > paraNumero(c.preco) && (
                    <span className="ui-texto-sm ui-suave">
                      economia {moeda(cheio - paraNumero(c.preco))}
                    </span>
                  )}
                </span>
                <span
                  className="ui-texto-sm"
                  style={{
                    width: 64,
                    textAlign: "right",
                    color: c.ativo ? "var(--ink-muted)" : "var(--danger-text)",
                  }}
                >
                  {c.ativo ? "Ativo" : "Inativo"}
                </span>
              </button>
            );
          })
        )}
      </section>
      {(novo || atual) && (
        <EditorCombo
          key={novo ? "novo" : atual!.id}
          combo={novo ? null : atual}
          aoSalvar={(c) => {
            aoAbrirNovo(false);
            selecao.aposSalvar(c);
            lista.recarregar();
          }}
        />
      )}
    </div>
  );
}

/** Monta o combo e compara o preço dele com a soma dos itens avulsos. */
function EditorCombo({
  combo,
  aoSalvar,
}: {
  combo: Combo | null;
  aoSalvar(c: Combo): void;
}) {
  const { executar, ocupado, erros } = useAcao();
  const listaProdutos = useConsulta("combo:produtos", (s) =>
    produtos.listar({ ativo: true, tamanhoPagina: 100 }, s),
  );
  const [nome, setNome] = useState(combo?.nome ?? "");
  const [preco, setPreco] = useState(campoDeDinheiro(combo?.preco));
  const [descricao, setDescricao] = useState(combo?.descricao ?? "");
  const [itens, setItens] = useState<
    { produtoId: number; quantidade: number }[]
  >(
    combo?.itens.map((i) => ({
      produtoId: i.produtoId,
      quantidade: i.quantidade,
    })) ?? [],
  );
  const [novoProduto, setNovoProduto] = useState("");

  // Produto desativado some da lista de ativos, mas pode estar no combo:
  // nesse caso o preço e o nome vêm do próprio combo.
  const precoDe = (id: number) =>
    paraNumero(
      listaProdutos.dados?.dados.find((p) => p.id === id)?.preco ??
        combo?.itens.find((i) => i.produtoId === id)?.precoIndividual,
    );
  const nomeDe = (id: number) =>
    listaProdutos.dados?.dados.find((p) => p.id === id)?.nome ??
    combo?.itens.find((i) => i.produtoId === id)?.nome ??
    `#${id}`;
  const somaAvulsa = itens.reduce(
    (s, i) => s + precoDe(i.produtoId) * i.quantidade,
    0,
  );
  const unidades = itens.reduce((s, i) => s + i.quantidade, 0);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const corpo = {
      nome: nome.trim(),
      preco: numeroDoCampo(preco),
      descricao: textoOuNulo(descricao),
      itens,
    };
    let salvo: Combo | undefined;
    const ok = await executar(
      async () => {
        salvo = combo
          ? await combos.atualizar(combo.id, corpo)
          : await combos.criar(corpo);
      },
      combo ? "Combo salvo" : "Combo criado",
    );
    if (ok && salvo) aoSalvar(salvo);
  }

  async function alternarAtivo() {
    if (!combo) return;
    let salvo: Combo | undefined;
    if (
      (await executar(
        async () => {
          salvo = await combos.atualizar(combo.id, { ativo: !combo.ativo });
        },
        combo.ativo ? "Combo desativado" : "Combo reativado",
      )) &&
      salvo
    )
      aoSalvar(salvo);
  }

  return (
    <section
      aria-labelledby="h-combo"
      className="ui-cartao ui-painel-metade sc-screen-enter"
      style={{ gap: 18, padding: 20 }}
    >
      <h2 id="h-combo" style={{ font: "600 24px/30px var(--font-display)" }}>
        {combo ? combo.nome : "Novo combo"}
      </h2>
      <form
        className="ui-coluna"
        style={{ gap: 16 }}
        onSubmit={salvar}
        noValidate
      >
        <div className="ui-form">
          <Campo rotulo="Nome" erro={erros.nome} className="ui-form__inteiro">
            <input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo
            rotulo="Preço do combo (R$)"
            erro={erros.preco}
            ajuda={
              somaAvulsa > 0 ? `Avulsos somam ${moeda(somaAvulsa)}.` : undefined
            }
          >
            <input
              inputMode="decimal"
              className="sc-input sc-tnum"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Descrição (opcional)" className="ui-form__inteiro">
            <textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </Campo>
        </div>
        <fieldset className="ui-grupo">
          <legend>
            Produtos do combo{" "}
            <span className="ui-texto-sm ui-suave">mínimo de 2 unidades</span>
          </legend>
          <div className="ui-coluna" style={{ gap: 6 }}>
            {itens.map((i) => (
              <div
                key={i.produtoId}
                className="ui-linha ui-bloco"
                style={{ padding: "6px 6px 6px 14px" }}
              >
                <span style={{ flex: 1, fontWeight: 700 }}>
                  {nomeDe(i.produtoId)}
                </span>
                <input
                  aria-label={`Quantidade de ${nomeDe(i.produtoId)}`}
                  type="number"
                  min={1}
                  max={20}
                  className="sc-input sc-tnum"
                  style={{ width: 80 }}
                  value={i.quantidade}
                  onChange={(e) =>
                    setItens((l) =>
                      l.map((x) =>
                        x.produtoId === i.produtoId
                          ? {
                              ...x,
                              quantidade: Math.max(
                                1,
                                Number(e.target.value) || 1,
                              ),
                            }
                          : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="sc-btn sc-btn--ghost ui-botao-icone"
                  aria-label={`Tirar ${nomeDe(i.produtoId)}`}
                  onClick={() =>
                    setItens((l) =>
                      l.filter((x) => x.produtoId !== i.produtoId),
                    )
                  }
                >
                  <Icone nome="lixeira" tamanho={18} />
                </button>
              </div>
            ))}
            <div className="ui-linha">
              <select
                className="sc-input"
                aria-label="Produto para incluir"
                value={novoProduto}
                onChange={(e) => setNovoProduto(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Incluir produto…</option>
                {listaProdutos.dados?.dados
                  .filter((p) => !itens.some((i) => i.produtoId === p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} · {moeda(p.preco)}
                    </option>
                  ))}
              </select>
              <Botao
                variante="fantasma"
                disabled={!novoProduto}
                onClick={() => {
                  setItens((l) => [
                    ...l,
                    { produtoId: Number(novoProduto), quantidade: 1 },
                  ]);
                  setNovoProduto("");
                }}
              >
                Incluir
              </Botao>
            </div>
            {erros.itens && <p className="ui-erro">{erros.itens}</p>}
          </div>
        </fieldset>
        <div className="ui-linha" style={{ justifyContent: "flex-end" }}>
          {combo && (
            <Botao
              variante="fantasma"
              onClick={alternarAtivo}
              disabled={ocupado}
            >
              {combo.ativo ? "Desativar" : "Reativar"}
            </Botao>
          )}
          <Botao
            type="submit"
            variante="primario"
            carregando={ocupado}
            textoCarregando="Salvando…"
            disabled={unidades < 2}
          >
            {combo ? "Salvar alterações" : "Criar combo"}
          </Botao>
        </div>
      </form>
    </section>
  );
}
