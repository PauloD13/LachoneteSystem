import { useState, type FormEvent } from "react";
import { useConsulta } from "../../hooks/useConsulta";
import { useAcao } from "../../hooks/useAcao";
import { fornecedores, ingredientes } from "../../services/cadastros";
import { Botao } from "../../components/ui/Botao";
import { Campo } from "../../components/ui/Campo";
import { Chip } from "../../components/ui/Chip";
import { Confirmacao } from "../../components/ui/Confirmacao";
import { Folha } from "../../components/ui/Folha";
import { Icone } from "../../components/ui/Icone";
import { Paginacao } from "../../components/ui/Paginacao";
import { ErroAoCarregar, Esqueleto, Vazio } from "../../components/ui/Estados";
import { numeroDoCampo, textoOuNulo } from "../../lib/formularios";
import { quantidade, telefone } from "../../lib/formatadores";
import { ROTULO_UNIDADE } from "../../lib/rotulos";
import type {
  Fornecedor,
  Ingrediente,
  UnidadeMedida,
} from "../../types/dominio";

/**
 * Tela 13 — Estoque: ingredientes (menor estoque primeiro), alerta de
 * reposição pelo estoque mínimo e fornecedores.
 */
export function EstoquePage() {
  // Menor estoque primeiro: o que está acabando aparece no topo.
  const [ordem, setOrdem] = useState<"estoque" | "nome">("estoque");
  const [busca, setBusca] = useState("");
  const [soRepor, setSoRepor] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [ingrediente, setIngrediente] = useState<Ingrediente | "novo" | null>(
    null,
  );
  const [fornecedor, setFornecedor] = useState<Fornecedor | "novo" | null>(
    null,
  );
  const termo = busca.trim();

  // Trocar a ordem ou a busca volta para a página 1 (ver setPagina(1) abaixo).
  const ings = useConsulta(
    `estoque:${ordem}:${termo}:${soRepor}:${pagina}`,
    (s) =>
      ingredientes.listar(
        {
          ordem,
          busca: termo || undefined,
          repor: soRepor || undefined,
          pagina,
          tamanhoPagina: 20,
        },
        s,
      ),
  );
  // Só o total interessa: é o contador do alerta.
  const aRepor = useConsulta("estoque:repor", (s) =>
    ingredientes.listar({ repor: true, tamanhoPagina: 1 }, s),
  );
  const totalARepor = aRepor.dados?.paginacao.total ?? 0;
  const forns = useConsulta("estoque:fornecedores", (s) =>
    fornecedores.listar({ tamanhoPagina: 100 }, s),
  );

  return (
    <>
      <header className="ui-cabecalho-gerencia">
        <div className="ui-coluna" style={{ gap: 0 }}>
          <h1>Estoque</h1>
          <span
            className="ui-suave"
            style={{ font: "600 15px/22px var(--font-sans)" }}
          >
            {ings.dados && forns.dados
              ? `${ings.dados.paginacao.total} ingredientes · ${forns.dados.paginacao.total} fornecedores`
              : " "}
            {totalARepor > 0 && ` · ${totalARepor} para repor`}
          </span>
        </div>
        <Botao
          variante="primario"
          onClick={() => setIngrediente("novo")}
          disabled={forns.dados?.dados.length === 0}
        >
          <Icone nome="mais" />
          Novo ingrediente
        </Botao>
      </header>

      <div className="ui-paineis">
        <section aria-labelledby="h-ing" className="ui-cartao ui-painel-largo">
          <div className="ui-linha ui-linha--entre ui-linha--quebra">
            <h2 id="h-ing" className="ui-titulo-secao">
              Ingredientes
            </h2>
            <div
              className="ui-linha ui-linha--quebra"
              role="group"
              aria-label="Filtrar e ordenar"
            >
              <Chip
                selecionado={soRepor}
                onClick={() => {
                  setSoRepor((v) => !v);
                  setPagina(1);
                }}
              >
                Repor{totalARepor > 0 ? ` · ${totalARepor}` : ""}
              </Chip>
              <Chip
                selecionado={ordem === "estoque"}
                onClick={() => {
                  setOrdem("estoque");
                  setPagina(1);
                }}
              >
                Menor estoque primeiro
              </Chip>
              <Chip
                selecionado={ordem === "nome"}
                onClick={() => {
                  setOrdem("nome");
                  setPagina(1);
                }}
              >
                A–Z
              </Chip>
            </div>
          </div>
          <label className="ui-busca">
            <span className="sr-only">Buscar ingrediente</span>
            <Icone nome="busca" />
            <input
              className="sc-input"
              type="search"
              placeholder="Buscar ingrediente"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
            />
          </label>
          {ings.erro ? (
            <ErroAoCarregar erro={ings.erro} aoTentarDeNovo={ings.recarregar} />
          ) : !ings.dados ? (
            <Esqueleto linhas={6} altura={44} />
          ) : ings.dados.dados.length === 0 ? (
            <Vazio icone="estoque">
              {forns.dados?.dados.length === 0
                ? "Cadastre um fornecedor primeiro; depois, os ingredientes."
                : soRepor
                  ? "Nada para repor: tudo acima do estoque mínimo."
                  : "Nenhum ingrediente."}
            </Vazio>
          ) : (
            <>
              <div className="ui-tabela-rolagem">
                <table className="ui-tabela" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th>Ingrediente</th>
                      <th className="ui-direita">Em estoque</th>
                      <th>Fornecedor</th>
                      <th className="ui-direita">Usado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ings.dados.dados.map((i) => (
                      <tr
                        key={i.id}
                        className="ui-clicavel"
                        onClick={() => setIngrediente(i)}
                      >
                        <td>
                          <span className="ui-linha" style={{ gap: 8 }}>
                            <button
                              type="button"
                              className="ui-linha-botao"
                              onClick={() => setIngrediente(i)}
                            >
                              {i.nome}
                            </button>
                            {i.repor && (
                              <span className="ui-selo-alerta">
                                <Icone nome="alerta" tamanho={14} />
                                Repor
                              </span>
                            )}
                          </span>
                        </td>
                        <td
                          className="ui-direita sc-tnum"
                          style={{
                            fontWeight: 800,
                            color:
                              Number(i.quantidadeEstoque) <= 0
                                ? "var(--danger-text)"
                                : undefined,
                          }}
                        >
                          {quantidade(i.quantidadeEstoque)}{" "}
                          {ROTULO_UNIDADE[i.unidadeMedida]}
                          {Number(i.estoqueMinimo) > 0 && (
                            <span
                              className="ui-texto-sm ui-suave"
                              style={{ display: "block", fontWeight: 600 }}
                            >
                              mín. {quantidade(i.estoqueMinimo)}
                            </span>
                          )}
                        </td>
                        <td className="ui-suave">{i.fornecedor.nome}</td>
                        <td className="ui-direita sc-tnum">
                          {i.usadoEm ?? 0}{" "}
                          {i.usadoEm === 1 ? "produto" : "produtos"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacao paginacao={ings.dados.paginacao} aoMudar={setPagina} />
            </>
          )}
          <p className="ui-texto-sm ui-suave">
            O estoque baixa sozinho pela ficha técnica quando um pedido entra em
            preparo. Com o estoque mínimo preenchido, o ingrediente pede
            reposição ao chegar nele. O consumo do período sai em Relatórios.
          </p>
        </section>

        <section
          aria-labelledby="h-forn"
          className="ui-cartao ui-painel-estreito"
          style={{ gap: 6 }}
        >
          <div className="ui-linha ui-linha--entre">
            <h2 id="h-forn" className="ui-titulo-secao">
              Fornecedores
            </h2>
            <Botao variante="fantasma" onClick={() => setFornecedor("novo")}>
              Novo
            </Botao>
          </div>
          {forns.erro ? (
            <ErroAoCarregar
              erro={forns.erro}
              aoTentarDeNovo={forns.recarregar}
            />
          ) : !forns.dados ? (
            <Esqueleto linhas={3} altura={56} />
          ) : forns.dados.dados.length === 0 ? (
            <Vazio icone="estoque">Nenhum fornecedor.</Vazio>
          ) : (
            forns.dados.dados.map((f) => (
              <button
                key={f.id}
                type="button"
                className="ui-item-lista"
                onClick={() => setFornecedor(f)}
              >
                <span
                  className="ui-coluna"
                  style={{ gap: 0, flex: 1, minWidth: 0 }}
                >
                  <span className="ui-linha ui-linha--entre">
                    <span style={{ fontWeight: 800 }}>{f.nome}</span>
                    <span className="ui-texto-sm ui-suave">
                      {f.totalIngredientes}{" "}
                      {f.totalIngredientes === 1 ? "item" : "itens"}
                    </span>
                  </span>
                  <span className="ui-texto-sm ui-suave">
                    {f.ingredientesPrevia.join(", ")}
                    {f.totalIngredientes > f.ingredientesPrevia.length &&
                      ` e mais ${f.totalIngredientes - f.ingredientesPrevia.length}`}
                    {f.telefone && ` · ${telefone(f.telefone)}`}
                  </span>
                </span>
              </button>
            ))
          )}
        </section>
      </div>

      <Folha
        aberta={ingrediente !== null}
        aoFechar={() => setIngrediente(null)}
        titulo={ingrediente === "novo" ? "Novo ingrediente" : "Ingrediente"}
        largura={560}
      >
        {ingrediente !== null && (
          <FormIngrediente
            ingrediente={ingrediente === "novo" ? null : ingrediente}
            fornecedores={forns.dados?.dados ?? []}
            aoConcluir={() => {
              setIngrediente(null);
              ings.recarregar();
              aRepor.recarregar();
              forns.recarregar();
            }}
          />
        )}
      </Folha>
      <Folha
        aberta={fornecedor !== null}
        aoFechar={() => setFornecedor(null)}
        titulo={fornecedor === "novo" ? "Novo fornecedor" : "Fornecedor"}
        largura={560}
      >
        {fornecedor !== null && (
          <FormFornecedor
            fornecedor={fornecedor === "novo" ? null : fornecedor}
            aoConcluir={() => {
              setFornecedor(null);
              forns.recarregar();
              ings.recarregar();
            }}
          />
        )}
      </Folha>
    </>
  );
}

/** Cria ou edita um ingrediente (estoque, unidade, fornecedor). */
function FormIngrediente({
  ingrediente,
  fornecedores: lista,
  aoConcluir,
}: {
  ingrediente: Ingrediente | null;
  fornecedores: Fornecedor[];
  aoConcluir(): void;
}) {
  const { executar, ocupado, erros } = useAcao();
  // A listagem não traz em quais produtos o ingrediente é usado; o detalhe traz.
  const detalhe = useConsulta(`ingrediente:${ingrediente?.id}`, (s) =>
    ingrediente
      ? ingredientes.buscar(ingrediente.id, s)
      : Promise.resolve(undefined),
  );
  const [nome, setNome] = useState(ingrediente?.nome ?? "");
  const [qtd, setQtd] = useState(
    ingrediente ? quantidade(ingrediente.quantidadeEstoque) : "",
  );
  const [minimo, setMinimo] = useState(
    ingrediente && Number(ingrediente.estoqueMinimo) > 0
      ? quantidade(ingrediente.estoqueMinimo)
      : "",
  );
  const [unidade, setUnidade] = useState<UnidadeMedida>(
    ingrediente?.unidadeMedida ?? "unidade",
  );
  const [fornecedorId, setFornecedorId] = useState(
    String(ingrediente?.fornecedorId ?? lista[0]?.id ?? ""),
  );
  const [excluir, setExcluir] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const corpo = {
      nome: nome.trim(),
      quantidadeEstoque: numeroDoCampo(qtd || "0"),
      estoqueMinimo: numeroDoCampo(minimo || "0"),
      unidadeMedida: unidade,
      fornecedorId: Number(fornecedorId),
    };
    if (
      await executar(
        () =>
          ingrediente
            ? ingredientes.atualizar(ingrediente.id, corpo)
            : ingredientes.criar(corpo),
        ingrediente ? "Ingrediente salvo" : "Ingrediente cadastrado",
      )
    )
      aoConcluir();
  }

  return (
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
        <Campo rotulo="Em estoque" erro={erros.quantidadeEstoque}>
          <input
            inputMode="decimal"
            className="sc-input sc-tnum"
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
          />
        </Campo>
        <Campo
          rotulo="Estoque mínimo (opcional)"
          erro={erros.estoqueMinimo}
          ajuda="Abaixo disso, o ingrediente aparece em Repor."
        >
          <input
            inputMode="decimal"
            className="sc-input sc-tnum"
            value={minimo}
            onChange={(e) => setMinimo(e.target.value)}
          />
        </Campo>
        <Campo rotulo="Unidade">
          <select
            value={unidade}
            onChange={(e) => setUnidade(e.target.value as UnidadeMedida)}
          >
            <option value="unidade">Unidade</option>
            <option value="kg">Quilo (kg)</option>
            <option value="litro">Litro</option>
          </select>
        </Campo>
        <Campo
          rotulo="Fornecedor"
          erro={erros.fornecedorId}
          className="ui-form__inteiro"
        >
          <select
            value={fornecedorId}
            onChange={(e) => setFornecedorId(e.target.value)}
          >
            {lista.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      {detalhe.dados?.produtos && detalhe.dados.produtos.length > 0 && (
        <div className="ui-coluna" style={{ gap: 4 }}>
          <h3 style={{ font: "800 15px/20px var(--font-sans)" }}>Usado em</h3>
          {detalhe.dados.produtos.map((p) => (
            <div key={p.id} className="ui-valor ui-texto-sm">
              <span>{p.nome}</span>
              <span className="sc-tnum ui-suave">
                {quantidade(p.quantidadeUtilizada)} {ROTULO_UNIDADE[unidade]}{" "}
                por unidade
              </span>
            </div>
          ))}
        </div>
      )}
      <div
        className="ui-linha ui-linha--quebra"
        style={{ justifyContent: "flex-end" }}
      >
        {ingrediente && (
          <Botao
            variante="fantasma"
            style={{ color: "var(--danger-text)" }}
            onClick={() => setExcluir(true)}
          >
            Excluir
          </Botao>
        )}
        <Botao
          type="submit"
          variante="primario"
          carregando={ocupado}
          textoCarregando="Salvando…"
        >
          {ingrediente ? "Salvar ingrediente" : "Cadastrar ingrediente"}
        </Botao>
      </div>
      <Confirmacao
        aberta={excluir}
        titulo={`Excluir ${ingrediente?.nome}?`}
        confirmar="Excluir"
        perigo
        aoFechar={() => setExcluir(false)}
        aoConfirmar={async () => {
          if (
            ingrediente &&
            (await executar(
              () => ingredientes.remover(ingrediente.id),
              "Ingrediente excluído",
            ))
          )
            aoConcluir();
          setExcluir(false);
        }}
      >
        Ingrediente que está na ficha técnica de algum produto não pode ser
        excluído.
      </Confirmacao>
    </form>
  );
}

/** Cria ou edita um fornecedor. */
function FormFornecedor({
  fornecedor,
  aoConcluir,
}: {
  fornecedor: Fornecedor | null;
  aoConcluir(): void;
}) {
  const { executar, ocupado, erros } = useAcao();
  const [nome, setNome] = useState(fornecedor?.nome ?? "");
  const [tel, setTel] = useState(fornecedor?.telefone ?? "");
  const [email, setEmail] = useState(fornecedor?.email ?? "");
  const [excluir, setExcluir] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const corpo = {
      nome: nome.trim(),
      telefone: textoOuNulo(tel),
      email: textoOuNulo(email),
    };
    if (
      await executar(
        () =>
          fornecedor
            ? fornecedores.atualizar(fornecedor.id, corpo)
            : fornecedores.criar(corpo),
        fornecedor ? "Fornecedor salvo" : "Fornecedor cadastrado",
      )
    )
      aoConcluir();
  }

  return (
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
        <Campo rotulo="Telefone (opcional)" erro={erros.telefone}>
          <input
            type="tel"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
          />
        </Campo>
        <Campo rotulo="E-mail (opcional)" erro={erros.email}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Campo>
      </div>
      <div
        className="ui-linha ui-linha--quebra"
        style={{ justifyContent: "flex-end" }}
      >
        {fornecedor && (
          <Botao
            variante="fantasma"
            style={{ color: "var(--danger-text)" }}
            onClick={() => setExcluir(true)}
          >
            Excluir
          </Botao>
        )}
        <Botao
          type="submit"
          variante="primario"
          carregando={ocupado}
          textoCarregando="Salvando…"
        >
          {fornecedor ? "Salvar fornecedor" : "Cadastrar fornecedor"}
        </Botao>
      </div>
      <Confirmacao
        aberta={excluir}
        titulo={`Excluir ${fornecedor?.nome}?`}
        confirmar="Excluir"
        perigo
        aoFechar={() => setExcluir(false)}
        aoConfirmar={async () => {
          if (
            fornecedor &&
            (await executar(
              () => fornecedores.remover(fornecedor.id),
              "Fornecedor excluído",
            ))
          )
            aoConcluir();
          setExcluir(false);
        }}
      >
        Fornecedor com ingredientes não pode ser excluído: troque o fornecedor
        deles antes.
      </Confirmacao>
    </form>
  );
}
