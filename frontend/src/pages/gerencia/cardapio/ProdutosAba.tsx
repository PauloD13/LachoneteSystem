import { useState, type FormEvent } from "react";
import { useConsulta } from "../../../hooks/useConsulta";
import { useAcao } from "../../../hooks/useAcao";
import {
  categorias,
  fichaTecnica,
  ingredientes,
  produtos,
  variacoes,
} from "../../../services/cadastros";
import { Botao } from "../../../components/ui/Botao";
import { Campo } from "../../../components/ui/Campo";
import { Chip } from "../../../components/ui/Chip";
import { Confirmacao } from "../../../components/ui/Confirmacao";
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
import { moeda, paraNumero, quantidade } from "../../../lib/formatadores";
import { ROTULO_UNIDADE } from "../../../lib/rotulos";
import type { Produto } from "../../../types/dominio";

/** Aba Produtos: lista por categoria + edição com variações e ficha técnica. */
export function ProdutosAba({
  novo,
  aoAbrirNovo,
}: {
  novo: boolean;
  aoAbrirNovo(v: boolean): void;
}) {
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const cats = useConsulta("cardapio:categorias", (s) =>
    categorias.listar({ tamanhoPagina: 100 }, s),
  );
  const lista = useConsulta(`cardapio:produtos:${categoriaId}`, (s) =>
    produtos.listar(
      { categoriaId: categoriaId ?? undefined, tamanhoPagina: 100 },
      s,
    ),
  );
  const atual = novo
    ? null
    : (lista.dados?.dados.find((p) => p.id === selecionado) ??
      lista.dados?.dados[0] ??
      null);

  return (
    <div className="ui-paineis">
      <section
        aria-label="Produtos"
        className="ui-cartao ui-painel-metade"
        style={{ gap: 8 }}
      >
        <div
          className="ui-faixa"
          role="group"
          aria-label="Filtrar por categoria"
        >
          <Chip
            selecionado={categoriaId === null}
            onClick={() => setCategoriaId(null)}
          >
            Todas
          </Chip>
          {cats.dados?.dados.map((c) => (
            <Chip
              key={c.id}
              selecionado={categoriaId === c.id}
              onClick={() => setCategoriaId(c.id)}
            >
              {c.nome}
            </Chip>
          ))}
        </div>
        {lista.erro ? (
          <ErroAoCarregar erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
        ) : !lista.dados ? (
          <Esqueleto linhas={5} altura={48} />
        ) : lista.dados.dados.length === 0 ? (
          <Vazio icone="cardapio">
            Nenhum produto aqui. Use “Novo produto”.
          </Vazio>
        ) : (
          lista.dados.dados.map((p) => (
            <button
              key={p.id}
              type="button"
              className="ui-item-lista"
              aria-current={atual?.id === p.id}
              onClick={() => {
                aoAbrirNovo(false);
                setSelecionado(p.id);
              }}
            >
              <span
                className="ui-coluna"
                style={{ gap: 0, flex: 1, minWidth: 0 }}
              >
                <span style={{ fontWeight: 800 }}>{p.nome}</span>
                <span className="ui-texto-sm ui-suave">
                  {p.categoriaNome}
                  {p.totalVariacoes > 0 && ` · ${p.totalVariacoes} variações`}
                  {p.promocaoVigente && ` · em promoção`}
                </span>
              </span>
              <span className="sc-tnum">{moeda(p.preco)}</span>
              <span
                className="ui-texto-sm"
                style={{
                  width: 64,
                  textAlign: "right",
                  color: p.ativo ? "var(--ink-muted)" : "var(--danger-text)",
                }}
              >
                {p.ativo ? "Ativo" : "Inativo"}
              </span>
            </button>
          ))
        )}
      </section>

      {(novo || atual) && (
        <EditorProduto
          key={novo ? "novo" : atual!.id}
          produto={novo ? null : atual}
          categorias={cats.dados?.dados ?? []}
          aoSalvar={(p) => {
            aoAbrirNovo(false);
            setSelecionado(p.id);
            lista.recarregar();
          }}
        />
      )}
    </div>
  );
}

function EditorProduto({
  produto,
  categorias: listaCategorias,
  aoSalvar,
}: {
  produto: Produto | null;
  categorias: { id: number; nome: string }[];
  aoSalvar(p: Produto): void;
}) {
  const { executar, ocupado, erros } = useAcao();
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [categoriaId, setCategoriaId] = useState(
    String(produto?.categoriaId ?? listaCategorias[0]?.id ?? ""),
  );
  const [preco, setPreco] = useState(campoDeDinheiro(produto?.preco));
  const [descricao, setDescricao] = useState(produto?.descricao ?? "");
  const [confirmarDesativar, setConfirmarDesativar] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const corpo = {
      nome: nome.trim(),
      categoriaId: Number(categoriaId),
      preco: numeroDoCampo(preco),
      descricao: textoOuNulo(descricao),
    };
    let salvo: Produto | undefined;
    const ok = await executar(
      async () => {
        salvo = produto
          ? await produtos.atualizar(produto.id, corpo)
          : await produtos.criar(corpo);
      },
      produto ? "Produto salvo" : "Produto criado",
    );
    if (ok && salvo) aoSalvar(salvo);
  }

  async function alternarAtivo() {
    if (!produto) return;
    let salvo: Produto | undefined;
    const ok = await executar(
      async () => {
        salvo = await produtos.atualizar(produto.id, { ativo: !produto.ativo });
      },
      produto.ativo
        ? "Produto fora do cardápio"
        : "Produto de volta ao cardápio",
    );
    if (ok && salvo) aoSalvar(salvo);
    setConfirmarDesativar(false);
  }

  return (
    <section
      aria-labelledby="h-edit"
      className="ui-cartao ui-painel-metade sc-screen-enter"
      style={{ gap: 18, padding: 20 }}
    >
      <h2 id="h-edit" style={{ font: "600 24px/30px var(--font-display)" }}>
        {produto ? produto.nome : "Novo produto"}
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
          <Campo rotulo="Categoria" erro={erros.categoriaId}>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              {listaCategorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Preço-base (R$)" erro={erros.preco}>
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
              maxLength={500}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </Campo>
        </div>
        {produto?.promocaoVigente && (
          <p className="ui-texto-sm">
            <span className="sc-promo">Promoção</span>{" "}
            {produto.promocaoVigente.nome}: hoje sai por{" "}
            <strong>{moeda(produto.precoVigente)}</strong>.
          </p>
        )}
        <div className="ui-linha" style={{ justifyContent: "flex-end" }}>
          {produto && (
            <Botao
              variante="fantasma"
              onClick={() =>
                produto.ativo ? setConfirmarDesativar(true) : alternarAtivo()
              }
              disabled={ocupado}
            >
              {produto.ativo ? "Desativar" : "Reativar"}
            </Botao>
          )}
          <Botao
            type="submit"
            variante="primario"
            carregando={ocupado}
            textoCarregando="Salvando…"
          >
            {produto ? "Salvar alterações" : "Criar produto"}
          </Botao>
        </div>
      </form>

      {produto ? (
        <>
          <Variacoes produtoId={produto.id} />
          <FichaTecnica produtoId={produto.id} />
        </>
      ) : (
        <p className="ui-texto-sm ui-suave">
          Variações e ficha técnica ficam disponíveis depois de criar o produto.
        </p>
      )}

      <Confirmacao
        aberta={confirmarDesativar}
        titulo={`Desativar ${produto?.nome}?`}
        confirmar="Desativar"
        confirmando="Desativando…"
        aoFechar={() => setConfirmarDesativar(false)}
        aoConfirmar={alternarAtivo}
      >
        O produto sai do cardápio e não entra em pedidos novos. Os pedidos
        antigos continuam com ele. Dá para reativar depois.
      </Confirmacao>
    </section>
  );
}

function Variacoes({ produtoId }: { produtoId: number }) {
  const lista = useConsulta(`variacoes:${produtoId}`, (s) =>
    variacoes.listar(produtoId, s),
  );
  const { executar, ocupado, erros } = useAcao();
  const [nome, setNome] = useState("");
  const [acrescimo, setAcrescimo] = useState("");
  const [abrindo, setAbrindo] = useState(false);

  async function adicionar(evento: FormEvent) {
    evento.preventDefault();
    const ok = await executar(
      () =>
        variacoes.criar(produtoId, {
          nome: nome.trim(),
          precoAdicional: numeroDoCampo(acrescimo || "0"),
        }),
      "Variação criada",
    );
    if (ok) {
      setNome("");
      setAcrescimo("");
      setAbrindo(false);
      lista.recarregar();
    }
  }

  return (
    <div className="ui-coluna" style={{ gap: 8 }}>
      <h3 style={{ font: "800 15px/20px var(--font-sans)" }}>Variações</h3>
      <p className="ui-texto-sm ui-suave">
        Ex.: tamanho. Quando há variações, o atendente precisa escolher uma.
      </p>
      <div className="ui-linha ui-linha--quebra">
        {lista.dados?.map((v) => (
          <span
            key={v.id}
            className="sc-chip"
            style={{ gap: 8, cursor: "default" }}
          >
            {v.nome} · +{moeda(v.precoAdicional)}
            <button
              type="button"
              aria-label={`Remover variação ${v.nome}`}
              style={{
                border: 0,
                background: "none",
                padding: 4,
                cursor: "pointer",
                color: "var(--ink-muted)",
                display: "grid",
              }}
              onClick={async () => {
                if (
                  await executar(
                    () => variacoes.remover(produtoId, v.id),
                    "Variação removida",
                  )
                )
                  lista.recarregar();
              }}
            >
              <Icone nome="fechar" tamanho={16} />
            </button>
          </span>
        ))}
        {!abrindo && (
          <Chip onClick={() => setAbrindo(true)} aria-pressed={undefined}>
            + Variação
          </Chip>
        )}
      </div>
      {abrindo && (
        <form
          className="ui-linha ui-linha--quebra"
          style={{ alignItems: "flex-end" }}
          onSubmit={adicionar}
          noValidate
        >
          <Campo rotulo="Nome" erro={erros.nome}>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Duplo"
            />
          </Campo>
          <Campo rotulo="Acréscimo (R$)" erro={erros.precoAdicional}>
            <input
              inputMode="decimal"
              value={acrescimo}
              onChange={(e) => setAcrescimo(e.target.value)}
              placeholder="0,00"
              style={{ width: 120 }}
              className="sc-input sc-tnum"
            />
          </Campo>
          <Botao type="submit" variante="fantasma" carregando={ocupado}>
            Adicionar
          </Botao>
          <Botao variante="fantasma" onClick={() => setAbrindo(false)}>
            Cancelar
          </Botao>
        </form>
      )}
    </div>
  );
}

function FichaTecnica({ produtoId }: { produtoId: number }) {
  const ficha = useConsulta(`ficha:${produtoId}`, (s) =>
    fichaTecnica.listar(produtoId, s),
  );
  const ings = useConsulta("ficha:ingredientes", (s) =>
    ingredientes.listar({ tamanhoPagina: 100 }, s),
  );
  const { executar, ocupado } = useAcao();
  const [ingredienteId, setIngredienteId] = useState("");
  const [qtd, setQtd] = useState("");

  const usados = new Set(ficha.dados?.map((f) => f.ingredienteId));
  const disponiveis = ings.dados?.dados.filter((i) => !usados.has(i.id)) ?? [];
  const unidade = ings.dados?.dados.find(
    (i) => i.id === Number(ingredienteId),
  )?.unidadeMedida;

  async function incluir(evento: FormEvent) {
    evento.preventDefault();
    const n = numeroDoCampo(qtd);
    if (!ingredienteId || !(n > 0)) return;
    if (
      await executar(
        () => fichaTecnica.definir(produtoId, Number(ingredienteId), n),
        "Ficha técnica atualizada",
      )
    ) {
      setIngredienteId("");
      setQtd("");
      ficha.recarregar();
    }
  }

  return (
    <div className="ui-coluna" style={{ gap: 8 }}>
      <div className="ui-linha" style={{ alignItems: "baseline" }}>
        <h3 style={{ font: "800 15px/20px var(--font-sans)" }}>
          Ficha técnica
        </h3>
        <span className="ui-texto-sm ui-suave">por unidade vendida</span>
      </div>
      {ficha.dados?.length === 0 && (
        <p className="ui-texto-sm ui-suave">
          Sem ingredientes ainda. A ficha alimenta o consumo estimado do
          estoque.
        </p>
      )}
      {ficha.dados?.map((f) => (
        <div
          key={f.id}
          className="ui-linha"
          style={{
            minHeight: 40,
            padding: "0 12px",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-100)",
            font: "600 15px/20px var(--font-sans)",
          }}
        >
          <span style={{ flex: 1 }}>{f.ingrediente.nome}</span>
          <span className="sc-tnum">
            {quantidade(f.quantidadeUtilizada)}{" "}
            {ROTULO_UNIDADE[f.ingrediente.unidadeMedida]}
          </span>
          <button
            type="button"
            className="sc-btn sc-btn--ghost ui-botao-icone"
            aria-label={`Tirar ${f.ingrediente.nome} da ficha`}
            onClick={async () => {
              if (
                await executar(
                  () => fichaTecnica.remover(produtoId, f.ingredienteId),
                  "Ingrediente retirado",
                )
              )
                ficha.recarregar();
            }}
          >
            <Icone nome="lixeira" tamanho={18} />
          </button>
        </div>
      ))}
      <form
        className="ui-linha ui-linha--quebra"
        style={{ alignItems: "flex-end" }}
        onSubmit={incluir}
        noValidate
      >
        <Campo rotulo="Ingrediente">
          <select
            value={ingredienteId}
            onChange={(e) => setIngredienteId(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <option value="">Escolha…</option>
            {disponiveis.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          rotulo={`Quantidade${unidade ? ` (${ROTULO_UNIDADE[unidade]})` : ""}`}
        >
          <input
            inputMode="decimal"
            className="sc-input sc-tnum"
            style={{ width: 120 }}
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
            placeholder="0,150"
          />
        </Campo>
        <Botao
          type="submit"
          variante="fantasma"
          carregando={ocupado}
          disabled={!ingredienteId || !(paraNumero(numeroDoCampo(qtd)) > 0)}
        >
          Incluir
        </Botao>
      </form>
    </div>
  );
}
