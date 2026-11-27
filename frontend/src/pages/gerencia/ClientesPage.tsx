import { useState } from "react";
import { useConsulta } from "../../hooks/useConsulta";
import { useAcao } from "../../hooks/useAcao";
import { useAuth } from "../../hooks/useAuth";
import { clientes } from "../../services/cadastros";
import { pedidos } from "../../services/pedidos";
import { Icone } from "../../components/ui/Icone";
import { Botao } from "../../components/ui/Botao";
import { Folha } from "../../components/ui/Folha";
import { Confirmacao } from "../../components/ui/Confirmacao";
import { ErroDaApi } from "../../services/api";
import { baixarJson } from "../../lib/arquivos";
import { Paginacao } from "../../components/ui/Paginacao";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ErroAoCarregar, Esqueleto, Vazio } from "../../components/ui/Estados";
import { FormCliente } from "../../components/pedido/FormCliente";
import { enderecoDoCliente } from "../../lib/clientes";
import {
  dataHora,
  inicial,
  moeda,
  numeroPedido,
  telefone,
} from "../../lib/formatadores";
import type { Cliente } from "../../types/dominio";
import { Link } from "react-router";

const MES_ANO = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
});

/** Tela 11 — Clientes: lista com busca + ficha com números e histórico. */
export function ClientesPage() {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [editando, setEditando] = useState<Cliente | "novo" | null>(null);
  const termo = busca.trim();

  const lista = useConsulta(`clientes:${termo}:${pagina}`, (sinal) =>
    clientes.listar(
      { busca: termo || undefined, pagina, tamanhoPagina: 15 },
      sinal,
    ),
  );
  // Sem escolha, a ficha mostra o primeiro da página.
  const idFicha = selecionado ?? lista.dados?.dados[0]?.id ?? null;

  return (
    <>
      <header className="ui-cabecalho-gerencia">
        <div className="ui-coluna" style={{ gap: 0 }}>
          <h1>Clientes</h1>
          <span
            className="ui-suave"
            style={{ font: "600 15px/22px var(--font-sans)" }}
          >
            {lista.dados
              ? `${lista.dados.paginacao.total} ${termo ? "encontrados" : "cadastrados"} · `
              : ""}
            obrigatório para pedidos de app e entrega
          </span>
        </div>
        <Botao variante="primario" onClick={() => setEditando("novo")}>
          <Icone nome="mais" />
          Novo cliente
        </Botao>
      </header>

      <div className="ui-paineis">
        <section
          aria-label="Lista de clientes"
          className="ui-cartao ui-painel-largo"
        >
          <label className="ui-busca">
            <span className="sr-only">Buscar cliente</span>
            <Icone nome="busca" />
            <input
              className="sc-input"
              type="search"
              placeholder="Nome, telefone ou e-mail"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
                setSelecionado(null);
              }}
            />
          </label>
          {lista.erro ? (
            <ErroAoCarregar
              erro={lista.erro}
              aoTentarDeNovo={lista.recarregar}
            />
          ) : !lista.dados ? (
            <Esqueleto linhas={6} altura={44} />
          ) : lista.dados.dados.length === 0 ? (
            <Vazio icone="pessoas">
              {termo
                ? "Nenhum cliente encontrado."
                : "Nenhum cliente cadastrado ainda."}
            </Vazio>
          ) : (
            <>
              <div className="ui-tabela-rolagem">
                <table className="ui-tabela" style={{ minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Telefone</th>
                      <th className="ui-direita">Pedidos</th>
                      <th>Último pedido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.dados.dados.map((c) => (
                      <tr
                        key={c.id}
                        aria-selected={c.id === idFicha}
                        className="ui-clicavel"
                        onClick={() => setSelecionado(c.id)}
                      >
                        <td>
                          <button
                            type="button"
                            className="ui-linha-botao"
                            onClick={() => setSelecionado(c.id)}
                          >
                            {c.nome}
                          </button>
                        </td>
                        <td>{telefone(c.telefone)}</td>
                        <td className="ui-direita sc-tnum">{c.totalPedidos}</td>
                        <td className="ui-suave">
                          {c.ultimoPedidoEm ? dataHora(c.ultimoPedidoEm) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacao
                paginacao={lista.dados.paginacao}
                aoMudar={setPagina}
              />
            </>
          )}
        </section>

        {idFicha !== null && (
          <Ficha
            key={idFicha}
            id={idFicha}
            aoEditar={setEditando}
            aoExcluir={() => {
              setSelecionado(null);
              lista.recarregar();
            }}
          />
        )}
      </div>

      <Folha
        aberta={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando === "novo" ? "Novo cliente" : "Editar cliente"}
        largura={640}
      >
        {editando !== null && (
          <FormCliente
            cliente={editando === "novo" ? null : editando}
            aoCancelar={() => setEditando(null)}
            aoSalvar={(c) => {
              setEditando(null);
              setSelecionado(c.id);
              lista.recarregar();
            }}
          />
        )}
      </Folha>
    </>
  );
}

/** Dados, endereço e últimos pedidos do cliente (consultas próprias). */
function Ficha({
  id,
  aoEditar,
  aoExcluir,
}: {
  id: number;
  aoEditar(c: Cliente): void;
  aoExcluir(): void;
}) {
  const { temCargo } = useAuth();
  const ficha = useConsulta(`cliente:${id}`, (sinal) =>
    clientes.buscar(id, sinal),
  );
  const historico = useConsulta(`cliente:${id}:pedidos`, (sinal) =>
    pedidos.listarDoCliente(id, { tamanhoPagina: 8 }, sinal),
  );

  if (ficha.erro) {
    return (
      <section className="ui-cartao ui-painel-estreito">
        <ErroAoCarregar erro={ficha.erro} aoTentarDeNovo={ficha.recarregar} />
      </section>
    );
  }
  const c = ficha.dados;
  if (!c) {
    return (
      <section className="ui-cartao ui-painel-estreito">
        <Esqueleto linhas={3} altura={64} />
      </section>
    );
  }
  const endereco = enderecoDoCliente(c);
  const nota = c.resumo.notaMedia
    ? Number(c.resumo.notaMedia).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
      })
    : "—";

  return (
    <section
      aria-labelledby="h-ficha"
      className="ui-cartao ui-painel-estreito sc-screen-enter"
      style={{ gap: 16, padding: 20 }}
    >
      <div className="ui-linha" style={{ gap: 14 }}>
        <span className="ui-avatar ui-avatar--grande" aria-hidden="true">
          {inicial(c.nome)}
        </span>
        <div className="ui-coluna" style={{ gap: 0, flex: 1, minWidth: 0 }}>
          <h2
            id="h-ficha"
            style={{ font: "600 24px/30px var(--font-display)" }}
          >
            {c.nome}
          </h2>
          <span className="ui-texto-sm ui-suave">
            {telefone(c.telefone)} · cliente desde{" "}
            {MES_ANO.format(new Date(c.criadoEm))}
          </span>
        </div>
        <Botao
          variante="fantasma"
          style={{ background: "var(--surface-300)", minHeight: 44 }}
          onClick={() => aoEditar(c)}
        >
          Editar
        </Botao>
      </div>
      <div className="ui-numeros">
        <div className="ui-numero">
          <div className="ui-numero__valor">{c.resumo.totalPedidos}</div>
          <div className="ui-numero__rotulo">pedidos</div>
        </div>
        <div className="ui-numero">
          <div className="ui-numero__valor">
            {c.resumo.ticketMedio
              ? moeda(c.resumo.ticketMedio).replace(",00", "")
              : "—"}
          </div>
          <div className="ui-numero__rotulo">ticket médio</div>
        </div>
        <div className="ui-numero">
          <div className="ui-numero__valor">{nota}</div>
          <div className="ui-numero__rotulo">nota média</div>
        </div>
      </div>
      <div className="ui-coluna" style={{ gap: 4 }}>
        <h3 style={{ font: "800 15px/20px var(--font-sans)" }}>
          Endereço de entrega
        </h3>
        <span
          style={{ font: "600 15px/22px var(--font-sans)" }}
          className={endereco ? undefined : "ui-suave"}
        >
          {endereco
            ? `${endereco} · ${c.enderecoPadraoCidade}`
            : "Sem endereço completo no cadastro."}
        </span>
        {c.email && <span className="ui-texto-sm ui-suave">{c.email}</span>}
      </div>
      <div className="ui-coluna" style={{ gap: 8 }}>
        <h3 style={{ font: "800 15px/20px var(--font-sans)" }}>
          Histórico de pedidos
        </h3>
        {historico.erro ? (
          <ErroAoCarregar
            erro={historico.erro}
            aoTentarDeNovo={historico.recarregar}
          />
        ) : !historico.dados ? (
          <Esqueleto linhas={3} altura={44} />
        ) : historico.dados.dados.length === 0 ? (
          <p className="ui-texto-sm ui-suave">Ainda não fez pedidos.</p>
        ) : (
          historico.dados.dados.map((p) => (
            <Link
              key={p.id}
              to={`/pedidos/${p.id}`}
              className="ui-linha"
              style={{
                gap: 12,
                minHeight: 44,
                padding: "0 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-inset)",
                color: "var(--ink)",
                textDecoration: "none",
              }}
            >
              <span
                style={{ width: 64, font: "600 16px/20px var(--font-display)" }}
              >
                {numeroPedido(p.id)}
              </span>
              <span className="ui-texto-sm ui-suave" style={{ flex: 1 }}>
                {dataHora(p.dataHora)}
              </span>
              <span
                className="sc-tnum"
                style={{ font: "800 14px/20px var(--font-sans)" }}
              >
                {moeda(p.totais.total)}
              </span>
              <StatusBadge status={p.statusAtual} tipo={p.tipoAtendimento} />
            </Link>
          ))
        )}
      </div>
      {temCargo("gerente") && (
        <DadosPessoais cliente={c} aoExcluir={aoExcluir} />
      )}
    </section>
  );
}

/**
 * LGPD (art. 18): o gerente atende os pedidos do titular. Exportar entrega
 * uma cópia de tudo; excluir apaga o cadastro de quem nunca pediu e, de quem
 * já pediu, apaga os dados pessoais mantendo os pedidos (anonimização).
 */
function DadosPessoais({
  cliente,
  aoExcluir,
}: {
  cliente: Cliente;
  aoExcluir(): void;
}) {
  const { executar, ocupado } = useAcao();
  const [confirmar, setConfirmar] = useState(false);

  async function exportar() {
    await executar(async () => {
      baixarJson(
        `cliente-${cliente.id}-dados.json`,
        await clientes.exportarDados(cliente.id),
      );
    }, "Arquivo com os dados gerado");
  }

  async function excluir() {
    const ok = await executar(async () => {
      try {
        await clientes.remover(cliente.id);
      } catch (erro) {
        // Tem pedidos: os pedidos ficam, os dados pessoais saem.
        if (erro instanceof ErroDaApi && erro.status === 409) {
          await clientes.anonimizar(cliente.id);
        } else {
          throw erro;
        }
      }
    }, "Dados pessoais excluídos");
    setConfirmar(false);
    if (ok) aoExcluir();
  }

  return (
    <div className="ui-coluna" style={{ gap: 8 }}>
      <h3 style={{ font: "800 15px/20px var(--font-sans)" }}>
        Dados pessoais (LGPD)
      </h3>
      <p className="ui-texto-sm ui-suave">
        A pedido do cliente: entregue uma cópia dos dados ou exclua-os.{" "}
        <Link to="/privacidade" className="ui-link">
          Aviso de privacidade
        </Link>
      </p>
      <div className="ui-linha ui-linha--quebra" style={{ gap: 8 }}>
        <Botao variante="fantasma" onClick={exportar} disabled={ocupado}>
          Exportar dados
        </Botao>
        <Botao
          variante="fantasma"
          onClick={() => setConfirmar(true)}
          disabled={ocupado}
          style={{ color: "var(--danger-text)" }}
        >
          Excluir dados pessoais
        </Botao>
      </div>
      <Confirmacao
        aberta={confirmar}
        titulo={`Excluir os dados de ${cliente.nome}?`}
        confirmar="Excluir dados"
        confirmando="Excluindo…"
        perigo
        aoFechar={() => setConfirmar(false)}
        aoConfirmar={excluir}
      >
        Sem pedidos, o cadastro é apagado. Com pedidos, nome, telefone, e-mail,
        endereço, observações e comentários são apagados, e os pedidos ficam
        como &quot;Cliente anonimizado&quot; (o registro de vendas precisa
        deles). Não dá para desfazer.
      </Confirmacao>
    </div>
  );
}
