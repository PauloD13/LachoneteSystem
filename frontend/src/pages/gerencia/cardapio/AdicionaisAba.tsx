import { useState, type FormEvent } from "react";
import { useConsulta } from "../../../hooks/useConsulta";
import { useAcao } from "../../../hooks/useAcao";
import { useSelecaoNaLista } from "../../../hooks/useSelecaoNaLista";
import { adicionais, categorias } from "../../../services/cadastros";
import { Botao } from "../../../components/ui/Botao";
import { Campo } from "../../../components/ui/Campo";
import {
  ErroAoCarregar,
  Esqueleto,
  Vazio,
} from "../../../components/ui/Estados";
import { campoDeDinheiro, numeroDoCampo } from "../../../lib/formularios";
import { moeda } from "../../../lib/formatadores";
import type { Adicional } from "../../../types/dominio";

/** Aba Adicionais: preço e categorias em que cada um é oferecido. */
export function AdicionaisAba({
  novo,
  aoAbrirNovo,
}: {
  novo: boolean;
  aoAbrirNovo(v: boolean): void;
}) {
  const lista = useConsulta("cardapio:adicionais", (s) =>
    adicionais.listar({ tamanhoPagina: 100 }, s),
  );
  const selecao = useSelecaoNaLista(lista.dados?.dados, lista.carregando);
  const atual = novo ? null : selecao.atual;

  return (
    <div className="ui-paineis">
      <section
        aria-label="Adicionais"
        className="ui-cartao ui-painel-metade"
        style={{ gap: 8 }}
      >
        {lista.erro ? (
          <ErroAoCarregar erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
        ) : !lista.dados ? (
          <Esqueleto linhas={4} altura={48} />
        ) : lista.dados.dados.length === 0 ? (
          <Vazio icone="cardapio">Nenhum adicional ainda.</Vazio>
        ) : (
          lista.dados.dados.map((a) => (
            <button
              key={a.id}
              type="button"
              className="ui-item-lista"
              aria-current={atual?.id === a.id}
              onClick={() => {
                aoAbrirNovo(false);
                selecao.selecionar(a.id);
              }}
            >
              <span
                className="ui-coluna"
                style={{ gap: 0, flex: 1, minWidth: 0 }}
              >
                <span style={{ fontWeight: 800 }}>{a.nome}</span>
                <span className="ui-texto-sm ui-suave">
                  {a.categorias.map((c) => c.nome).join(", ")}
                </span>
              </span>
              <span className="sc-tnum">+ {moeda(a.preco)}</span>
              <span
                className="ui-texto-sm"
                style={{
                  width: 64,
                  textAlign: "right",
                  color: a.ativo ? "var(--ink-muted)" : "var(--danger-text)",
                }}
              >
                {a.ativo ? "Ativo" : "Inativo"}
              </span>
            </button>
          ))
        )}
      </section>
      {(novo || atual) && (
        <EditorAdicional
          key={novo ? "novo" : atual!.id}
          adicional={novo ? null : atual}
          aoSalvar={(a) => {
            aoAbrirNovo(false);
            selecao.aposSalvar(a);
            lista.recarregar();
          }}
        />
      )}
    </div>
  );
}

function EditorAdicional({
  adicional,
  aoSalvar,
}: {
  adicional: Adicional | null;
  aoSalvar(a: Adicional): void;
}) {
  const { executar, ocupado, erros } = useAcao();
  const cats = useConsulta("cardapio:categorias", (s) =>
    categorias.listar({ tamanhoPagina: 100 }, s),
  );
  const [nome, setNome] = useState(adicional?.nome ?? "");
  const [preco, setPreco] = useState(campoDeDinheiro(adicional?.preco));
  const [marcadas, setMarcadas] = useState<number[]>(
    adicional?.categorias.map((c) => c.id) ?? [],
  );

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const corpo = {
      nome: nome.trim(),
      preco: numeroDoCampo(preco),
      // A lista inteira: ao editar, a API troca as categorias pelas marcadas,
      // e o adicional só é oferecido em itens dessas categorias.
      categoriaIds: marcadas,
    };
    let salvo: Adicional | undefined;
    const ok = await executar(
      async () => {
        salvo = adicional
          ? await adicionais.atualizar(adicional.id, corpo)
          : await adicionais.criar(corpo);
      },
      adicional ? "Adicional salvo" : "Adicional criado",
    );
    if (ok && salvo) aoSalvar(salvo);
  }

  // Desativar em vez de excluir: adicional já vendido continua nos pedidos
  // antigos, só deixa de ser oferecido.
  async function alternarAtivo() {
    if (!adicional) return;
    let salvo: Adicional | undefined;
    if (
      (await executar(
        async () => {
          salvo = await adicionais.atualizar(adicional.id, {
            ativo: !adicional.ativo,
          });
        },
        adicional.ativo ? "Adicional desativado" : "Adicional reativado",
      )) &&
      salvo
    )
      aoSalvar(salvo);
  }

  return (
    <section
      aria-labelledby="h-adic"
      className="ui-cartao ui-painel-metade sc-screen-enter"
      style={{ gap: 18, padding: 20 }}
    >
      <h2 id="h-adic" style={{ font: "600 24px/30px var(--font-display)" }}>
        {adicional ? adicional.nome : "Novo adicional"}
      </h2>
      <form
        className="ui-coluna"
        style={{ gap: 16 }}
        onSubmit={salvar}
        noValidate
      >
        <div className="ui-form">
          <Campo rotulo="Nome" erro={erros.nome}>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Bacon extra"
            />
          </Campo>
          <Campo rotulo="Preço (R$)" erro={erros.preco}>
            <input
              inputMode="decimal"
              className="sc-input sc-tnum"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
            />
          </Campo>
        </div>
        <fieldset className="ui-grupo">
          <legend>
            Oferecido em{" "}
            <span className="ui-texto-sm ui-suave">
              pelo menos uma categoria
            </span>
          </legend>
          <div className="ui-coluna" style={{ gap: 6 }}>
            {cats.dados?.dados.map((c) => (
              <label key={c.id} className="ui-opcao">
                <input
                  type="checkbox"
                  checked={marcadas.includes(c.id)}
                  onChange={(e) =>
                    setMarcadas((m) =>
                      e.target.checked
                        ? [...m, c.id]
                        : m.filter((id) => id !== c.id),
                    )
                  }
                />
                {c.nome}
              </label>
            ))}
          </div>
          {erros.categoriaIds && (
            <p className="ui-erro" style={{ marginTop: 8 }}>
              {erros.categoriaIds}
            </p>
          )}
          <p className="ui-texto-sm ui-suave" style={{ marginTop: 8 }}>
            Num combo, vale qualquer categoria dos produtos dele.
          </p>
        </fieldset>
        <div className="ui-linha" style={{ justifyContent: "flex-end" }}>
          {adicional && (
            <Botao
              variante="fantasma"
              onClick={alternarAtivo}
              disabled={ocupado}
            >
              {adicional.ativo ? "Desativar" : "Reativar"}
            </Botao>
          )}
          <Botao
            type="submit"
            variante="primario"
            carregando={ocupado}
            textoCarregando="Salvando…"
            disabled={marcadas.length === 0}
          >
            {adicional ? "Salvar alterações" : "Criar adicional"}
          </Botao>
        </div>
      </form>
    </section>
  );
}
