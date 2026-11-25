import { useState, type FormEvent } from "react";
import { useConsulta } from "../../../hooks/useConsulta";
import { useAcao } from "../../../hooks/useAcao";
import { categorias } from "../../../services/cadastros";
import { Botao } from "../../../components/ui/Botao";
import { Campo } from "../../../components/ui/Campo";
import { Confirmacao } from "../../../components/ui/Confirmacao";
import { Icone } from "../../../components/ui/Icone";
import { ErroAoCarregar, Esqueleto } from "../../../components/ui/Estados";
import type { Categoria } from "../../../types/dominio";

/** Aba Categorias: criar, renomear e excluir (sem produtos). */
export function CategoriasAba() {
  const lista = useConsulta("cardapio:categorias", (s) =>
    categorias.listar({ tamanhoPagina: 100 }, s),
  );
  const { executar, ocupado, erros } = useAcao();
  const [nova, setNova] = useState("");
  const [editando, setEditando] = useState<{ id: number; nome: string } | null>(
    null,
  );
  const [excluir, setExcluir] = useState<Categoria | null>(null);

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    if (
      await executar(
        () => categorias.criar({ nome: nova.trim() }),
        "Categoria criada",
      )
    ) {
      setNova("");
      lista.recarregar();
    }
  }

  return (
    <div className="ui-paineis">
      <section
        aria-label="Categorias"
        className="ui-cartao ui-painel-metade"
        style={{ gap: 6 }}
      >
        {lista.erro ? (
          <ErroAoCarregar erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
        ) : !lista.dados ? (
          <Esqueleto linhas={4} altura={48} />
        ) : (
          lista.dados.dados.map((c) =>
            editando?.id === c.id ? (
              <form
                key={c.id}
                className="ui-linha"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await executar(
                      () =>
                        categorias.atualizar(c.id, {
                          nome: editando.nome.trim(),
                        }),
                      "Categoria renomeada",
                    )
                  ) {
                    setEditando(null);
                    lista.recarregar();
                  }
                }}
              >
                <input
                  className="sc-input"
                  aria-label="Novo nome"
                  value={editando.nome}
                  onChange={(e) =>
                    setEditando({ id: c.id, nome: e.target.value })
                  }
                  style={{ flex: 1 }}
                  autoFocus
                />
                <Botao type="submit" variante="primario" carregando={ocupado}>
                  Salvar
                </Botao>
                <Botao variante="fantasma" onClick={() => setEditando(null)}>
                  Cancelar
                </Botao>
              </form>
            ) : (
              <div
                key={c.id}
                className="ui-item-lista"
                style={{ cursor: "default" }}
              >
                <span style={{ flex: 1, fontWeight: 800 }}>{c.nome}</span>
                <button
                  type="button"
                  className="sc-btn sc-btn--ghost ui-botao-icone"
                  aria-label={`Renomear ${c.nome}`}
                  onClick={() => setEditando({ id: c.id, nome: c.nome })}
                >
                  <Icone nome="lapis" tamanho={18} />
                </button>
                <button
                  type="button"
                  className="sc-btn sc-btn--ghost ui-botao-icone"
                  aria-label={`Excluir ${c.nome}`}
                  onClick={() => setExcluir(c)}
                >
                  <Icone nome="lixeira" tamanho={18} />
                </button>
              </div>
            ),
          )
        )}
      </section>
      <section
        aria-labelledby="h-nova-cat"
        className="ui-cartao ui-painel-metade"
        style={{ padding: 20 }}
      >
        <h2 id="h-nova-cat" className="ui-titulo-cartao">
          Nova categoria
        </h2>
        <form
          className="ui-linha"
          style={{ alignItems: "flex-end" }}
          onSubmit={criar}
          noValidate
        >
          <Campo rotulo="Nome" erro={erros.nome} className="ui-coluna">
            <input
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              placeholder="Ex.: Pastéis"
            />
          </Campo>
          <Botao
            type="submit"
            variante="primario"
            carregando={ocupado}
            disabled={nova.trim().length < 2}
          >
            Criar
          </Botao>
        </form>
        <p className="ui-texto-sm ui-suave">
          Categoria com produtos não pode ser excluída: mova os produtos antes.
          Os adicionais escolhem em quais categorias são oferecidos.
        </p>
      </section>
      <Confirmacao
        aberta={excluir !== null}
        titulo={`Excluir a categoria ${excluir?.nome}?`}
        confirmar="Excluir"
        confirmando="Excluindo…"
        perigo
        aoFechar={() => setExcluir(null)}
        aoConfirmar={async () => {
          if (
            excluir &&
            (await executar(
              () => categorias.remover(excluir.id),
              "Categoria excluída",
            ))
          )
            lista.recarregar();
          setExcluir(null);
        }}
      />
    </div>
  );
}
