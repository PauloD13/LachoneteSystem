import { useState, type FormEvent } from "react";
import { useConsulta } from "../../../hooks/useConsulta";
import { useAcao } from "../../../hooks/useAcao";
import { cupons, produtos, promocoes } from "../../../services/cadastros";
import { Botao } from "../../../components/ui/Botao";
import { Campo } from "../../../components/ui/Campo";
import { Confirmacao } from "../../../components/ui/Confirmacao";
import { Segmentado } from "../../../components/ui/Segmentado";
import {
  ErroAoCarregar,
  Esqueleto,
  Vazio,
} from "../../../components/ui/Estados";
import { campoDeDinheiro, numeroDoCampo } from "../../../lib/formularios";
import {
  dia,
  diaParaInput,
  hojeISO,
  moeda,
  paraNumero,
  somarDiasISO,
} from "../../../lib/formatadores";
import type { Cupom, Promocao, TipoDesconto } from "../../../types/dominio";

const desconto = (tipo: TipoDesconto, valor: string) =>
  tipo === "PERCENTUAL"
    ? `${paraNumero(valor).toLocaleString("pt-BR")}%`
    : moeda(valor);

function situacao(inicio: string, fim: string): { texto: string; cor: string } {
  const hoje = hojeISO();
  if (diaParaInput(fim) < hoje)
    return { texto: "Encerrada", cor: "var(--ink-muted)" };
  if (diaParaInput(inicio) > hoje)
    return { texto: "Agendada", cor: "var(--ink-muted)" };
  return { texto: "Vigente", cor: "var(--ink)" };
}

/** Aba Promoções e cupons (lado a lado). */
export function PromocoesAba() {
  return (
    <div className="ui-paineis">
      <Promocoes />
      <Cupons />
    </div>
  );
}

function Promocoes() {
  const lista = useConsulta("cardapio:promocoes", (s) =>
    promocoes.listar({ tamanhoPagina: 100 }, s),
  );
  const [editando, setEditando] = useState<Promocao | "nova" | null>(null);
  return (
    <section
      aria-labelledby="h-promos"
      className="ui-cartao ui-painel-metade"
      style={{ gap: 10 }}
    >
      <div className="ui-linha ui-linha--entre">
        <h2 id="h-promos" className="ui-titulo-cartao">
          Promoções
        </h2>
        <Botao variante="fantasma" onClick={() => setEditando("nova")}>
          Nova promoção
        </Botao>
      </div>
      <p className="ui-texto-sm ui-suave">
        Desconto em produtos por um período. Não acumulam: vale a melhor do dia.
      </p>
      {editando && (
        <EditorPromocao
          key={editando === "nova" ? "nova" : editando.id}
          promocao={editando === "nova" ? null : editando}
          aoFechar={(mudou) => {
            setEditando(null);
            if (mudou) lista.recarregar();
          }}
        />
      )}
      {lista.erro ? (
        <ErroAoCarregar erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
      ) : !lista.dados ? (
        <Esqueleto linhas={3} altura={56} />
      ) : lista.dados.dados.length === 0 ? (
        <Vazio icone="cupom">Nenhuma promoção.</Vazio>
      ) : (
        lista.dados.dados.map((p) => {
          const s = situacao(p.dataInicio, p.dataFim);
          return (
            <button
              key={p.id}
              type="button"
              className="ui-item-lista"
              onClick={() => setEditando(p)}
            >
              <span
                className="ui-coluna"
                style={{ gap: 0, flex: 1, minWidth: 0 }}
              >
                <span style={{ fontWeight: 800 }}>{p.nome}</span>
                <span className="ui-texto-sm ui-suave">
                  {dia(p.dataInicio)} – {dia(p.dataFim)} ·{" "}
                  {p.produtos.map((x) => x.nome).join(", ")}
                </span>
              </span>
              <span className="sc-tnum">
                − {desconto(p.tipoDesconto, p.valorDesconto)}
              </span>
              <span
                className="ui-texto-sm"
                style={{
                  width: 72,
                  textAlign: "right",
                  color: s.cor,
                  fontWeight: 800,
                }}
              >
                {s.texto}
              </span>
            </button>
          );
        })
      )}
    </section>
  );
}

function CamposDeDesconto({
  tipo,
  setTipo,
  valor,
  setValor,
  inicio,
  setInicio,
  fim,
  setFim,
  erros,
}: {
  tipo: TipoDesconto;
  setTipo(t: TipoDesconto): void;
  valor: string;
  setValor(v: string): void;
  inicio: string;
  setInicio(v: string): void;
  fim: string;
  setFim(v: string): void;
  erros: Record<string, string>;
}) {
  return (
    <div className="ui-form">
      <div className="ui-form__inteiro">
        <Segmentado<TipoDesconto>
          rotulo="Tipo de desconto"
          valor={tipo}
          aoMudar={setTipo}
          opcoes={[
            { valor: "PERCENTUAL", rotulo: "Percentual (%)" },
            { valor: "VALOR", rotulo: "Valor (R$)" },
          ]}
        />
      </div>
      <Campo
        rotulo={tipo === "PERCENTUAL" ? "Desconto (%)" : "Desconto (R$)"}
        erro={erros.valorDesconto}
      >
        <input
          inputMode="decimal"
          className="sc-input sc-tnum"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </Campo>
      <Campo rotulo="Começa em" erro={erros.dataInicio}>
        <input
          type="date"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
        />
      </Campo>
      <Campo rotulo="Termina em" erro={erros.dataFim}>
        <input
          type="date"
          value={fim}
          min={inicio}
          onChange={(e) => setFim(e.target.value)}
        />
      </Campo>
    </div>
  );
}

function EditorPromocao({
  promocao,
  aoFechar,
}: {
  promocao: Promocao | null;
  aoFechar(mudou: boolean): void;
}) {
  const { executar, ocupado, erros } = useAcao();
  const listaProdutos = useConsulta("promo:produtos", (s) =>
    produtos.listar({ tamanhoPagina: 100 }, s),
  );
  const [nome, setNome] = useState(promocao?.nome ?? "");
  const [tipo, setTipo] = useState<TipoDesconto>(
    promocao?.tipoDesconto ?? "PERCENTUAL",
  );
  const [valor, setValor] = useState(campoDeDinheiro(promocao?.valorDesconto));
  const [inicio, setInicio] = useState(
    diaParaInput(promocao?.dataInicio) || hojeISO(),
  );
  const [fim, setFim] = useState(
    diaParaInput(promocao?.dataFim) || somarDiasISO(hojeISO(), 7),
  );
  const [marcados, setMarcados] = useState<number[]>(
    promocao?.produtos.map((p) => p.id) ?? [],
  );
  const [excluir, setExcluir] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const corpo = {
      nome: nome.trim(),
      tipoDesconto: tipo,
      valorDesconto: numeroDoCampo(valor),
      dataInicio: inicio,
      dataFim: fim,
      produtoIds: marcados,
    };
    if (
      await executar(
        () =>
          promocao
            ? promocoes.atualizar(promocao.id, corpo)
            : promocoes.criar(corpo),
        promocao ? "Promoção salva" : "Promoção criada",
      )
    )
      aoFechar(true);
  }

  return (
    <form
      className="ui-coluna ui-bloco sc-enter"
      style={{ gap: 14, padding: 16 }}
      onSubmit={salvar}
      noValidate
    >
      <h3 style={{ font: "800 16px/22px var(--font-sans)" }}>
        {promocao ? `Editar: ${promocao.nome}` : "Nova promoção"}
      </h3>
      <Campo rotulo="Nome" erro={erros.nome}>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Terça do burger"
        />
      </Campo>
      <CamposDeDesconto
        {...{
          tipo,
          setTipo,
          valor,
          setValor,
          inicio,
          setInicio,
          fim,
          setFim,
          erros,
        }}
      />
      <fieldset className="ui-grupo">
        <legend>Produtos</legend>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 6,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {listaProdutos.dados?.dados.map((p) => (
            <label
              key={p.id}
              className="ui-opcao"
              style={{ background: "var(--surface-200)" }}
            >
              <input
                type="checkbox"
                checked={marcados.includes(p.id)}
                onChange={(e) =>
                  setMarcados((m) =>
                    e.target.checked
                      ? [...m, p.id]
                      : m.filter((id) => id !== p.id),
                  )
                }
              />
              {p.nome}
            </label>
          ))}
        </div>
        {erros.produtoIds && <p className="ui-erro">{erros.produtoIds}</p>}
      </fieldset>
      <div
        className="ui-linha ui-linha--quebra"
        style={{ justifyContent: "flex-end" }}
      >
        {promocao && (
          <Botao
            variante="fantasma"
            onClick={() => setExcluir(true)}
            style={{ color: "var(--danger-text)" }}
          >
            Excluir
          </Botao>
        )}
        <Botao variante="fantasma" onClick={() => aoFechar(false)}>
          Cancelar
        </Botao>
        <Botao
          type="submit"
          variante="primario"
          carregando={ocupado}
          disabled={marcados.length === 0}
        >
          Salvar promoção
        </Botao>
      </div>
      <Confirmacao
        aberta={excluir}
        titulo="Excluir esta promoção?"
        confirmar="Excluir"
        perigo
        aoFechar={() => setExcluir(false)}
        aoConfirmar={async () => {
          if (
            promocao &&
            (await executar(
              () => promocoes.remover(promocao.id),
              "Promoção excluída",
            ))
          )
            aoFechar(true);
          setExcluir(false);
        }}
      >
        Pedidos já feitos não mudam: o preço de cada item ficou gravado.
      </Confirmacao>
    </form>
  );
}

function Cupons() {
  const lista = useConsulta("cardapio:cupons", (s) =>
    cupons.listar({ tamanhoPagina: 100 }, s),
  );
  const [editando, setEditando] = useState<Cupom | "novo" | null>(null);
  return (
    <section
      aria-labelledby="h-cupons"
      className="ui-cartao ui-painel-metade"
      style={{ gap: 10 }}
    >
      <div className="ui-linha ui-linha--entre">
        <h2 id="h-cupons" className="ui-titulo-cartao">
          Cupons
        </h2>
        <Botao variante="fantasma" onClick={() => setEditando("novo")}>
          Novo cupom
        </Botao>
      </div>
      <p className="ui-texto-sm ui-suave">
        Código digitado no fechamento. Vale uma vez por cliente.
      </p>
      {editando && (
        <EditorCupom
          key={editando === "novo" ? "novo" : editando.id}
          cupom={editando === "novo" ? null : editando}
          aoFechar={(mudou) => {
            setEditando(null);
            if (mudou) lista.recarregar();
          }}
        />
      )}
      {lista.erro ? (
        <ErroAoCarregar erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
      ) : !lista.dados ? (
        <Esqueleto linhas={3} altura={56} />
      ) : lista.dados.dados.length === 0 ? (
        <Vazio icone="cupom">Nenhum cupom.</Vazio>
      ) : (
        lista.dados.dados.map((c) => {
          const s = situacao(c.dataInicio, c.dataFim);
          return (
            <button
              key={c.id}
              type="button"
              className="ui-item-lista"
              onClick={() => setEditando(c)}
            >
              <span className="sc-promo">{c.codigo}</span>
              <span className="ui-texto-sm ui-suave" style={{ flex: 1 }}>
                {dia(c.dataInicio)} – {dia(c.dataFim)}
              </span>
              <span className="sc-tnum">
                − {desconto(c.tipoDesconto, c.valorDesconto)}
              </span>
              <span
                className="ui-texto-sm"
                style={{
                  width: 72,
                  textAlign: "right",
                  color: s.cor,
                  fontWeight: 800,
                }}
              >
                {s.texto}
              </span>
            </button>
          );
        })
      )}
    </section>
  );
}

function EditorCupom({
  cupom,
  aoFechar,
}: {
  cupom: Cupom | null;
  aoFechar(mudou: boolean): void;
}) {
  const { executar, ocupado, erros } = useAcao();
  const [codigo, setCodigo] = useState(cupom?.codigo ?? "");
  const [tipo, setTipo] = useState<TipoDesconto>(
    cupom?.tipoDesconto ?? "PERCENTUAL",
  );
  const [valor, setValor] = useState(campoDeDinheiro(cupom?.valorDesconto));
  const [inicio, setInicio] = useState(
    diaParaInput(cupom?.dataInicio) || hojeISO(),
  );
  const [fim, setFim] = useState(
    diaParaInput(cupom?.dataFim) || somarDiasISO(hojeISO(), 30),
  );
  const [excluir, setExcluir] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const corpo = {
      codigo: codigo.trim().toUpperCase(),
      tipoDesconto: tipo,
      valorDesconto: numeroDoCampo(valor),
      dataInicio: inicio,
      dataFim: fim,
    };
    if (
      await executar(
        () => (cupom ? cupons.atualizar(cupom.id, corpo) : cupons.criar(corpo)),
        cupom ? "Cupom salvo" : "Cupom criado",
      )
    )
      aoFechar(true);
  }

  return (
    <form
      className="ui-coluna ui-bloco sc-enter"
      style={{ gap: 14, padding: 16 }}
      onSubmit={salvar}
      noValidate
    >
      <h3 style={{ font: "800 16px/22px var(--font-sans)" }}>
        {cupom ? `Editar: ${cupom.codigo}` : "Novo cupom"}
      </h3>
      <Campo
        rotulo="Código"
        erro={erros.codigo}
        ajuda="Letras, números, hífen e sublinhado."
      >
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="BEMVINDO10"
        />
      </Campo>
      <CamposDeDesconto
        {...{
          tipo,
          setTipo,
          valor,
          setValor,
          inicio,
          setInicio,
          fim,
          setFim,
          erros,
        }}
      />
      {cupom && (
        <p className="ui-texto-sm ui-suave">
          Depois de usado, o tipo e o valor do desconto não mudam mais.
        </p>
      )}
      <div
        className="ui-linha ui-linha--quebra"
        style={{ justifyContent: "flex-end" }}
      >
        {cupom && (
          <Botao
            variante="fantasma"
            onClick={() => setExcluir(true)}
            style={{ color: "var(--danger-text)" }}
          >
            Excluir
          </Botao>
        )}
        <Botao variante="fantasma" onClick={() => aoFechar(false)}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" carregando={ocupado}>
          Salvar cupom
        </Botao>
      </div>
      <Confirmacao
        aberta={excluir}
        titulo={`Excluir o cupom ${cupom?.codigo}?`}
        confirmar="Excluir"
        perigo
        aoFechar={() => setExcluir(false)}
        aoConfirmar={async () => {
          if (
            cupom &&
            (await executar(() => cupons.remover(cupom.id), "Cupom excluído"))
          )
            aoFechar(true);
          setExcluir(false);
        }}
      >
        Cupom já usado em pedidos não pode ser excluído.
      </Confirmacao>
    </form>
  );
}
