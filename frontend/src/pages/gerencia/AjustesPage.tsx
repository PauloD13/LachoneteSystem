import { useState, type FormEvent } from "react";
import { useConsulta } from "../../hooks/useConsulta";
import { useAcao } from "../../hooks/useAcao";
import { cargos, formasPagamento, mesas } from "../../services/cadastros";
import { Botao } from "../../components/ui/Botao";
import { Campo } from "../../components/ui/Campo";
import { ErroAoCarregar, Esqueleto } from "../../components/ui/Estados";
import { PreferenciaTema } from "../../components/conta/PreferenciaTema";
import { TrocarSenha } from "../../components/conta/TrocarSenha";
import { rotuloFormaPagamento } from "../../lib/rotulos";

const CARGOS_BASE = ["atendente", "cozinheiro", "entregador", "gerente"];

/** Proposta — Ajustes: mesas, formas de pagamento, cargos, tema e senha. */
export function AjustesPage() {
  return (
    <>
      <header className="ui-cabecalho-gerencia">
        <h1>Ajustes</h1>
      </header>
      <div className="ui-paineis">
        <Mesas />
        <div className="ui-coluna ui-painel-metade" style={{ gap: 20 }}>
          <ListaSimples
            titulo="Formas de pagamento"
            chave="formas"
            listar={(s) => formasPagamento.listar({ tamanhoPagina: 100 }, s)}
            criar={(nome) => formasPagamento.criar({ nome })}
            rotulo={(f) => rotuloFormaPagamento(f.nome)}
            dica="Use minúsculas e sublinhado, como as que já existem (ex.: vale_alimentacao)."
          />
          <ListaSimples
            titulo="Cargos"
            chave="cargos"
            listar={(s) => cargos.listar({ tamanhoPagina: 100 }, s)}
            criar={(nome) => cargos.criar({ nome })}
            rotulo={(c) =>
              CARGOS_BASE.includes(c.nome) ? `${c.nome} (do sistema)` : c.nome
            }
            dica="Os quatro cargos do sistema decidem as permissões e não podem ser alterados."
          />
        </div>
        <section
          aria-labelledby="h-conta"
          className="ui-cartao ui-painel-metade"
        >
          <h2 id="h-conta" className="ui-titulo-secao">
            Minha conta
          </h2>
          <h3 className="ui-titulo-cartao">Tema</h3>
          <PreferenciaTema />
          <h3 className="ui-titulo-cartao" style={{ marginTop: 8 }}>
            Trocar senha
          </h3>
          <TrocarSenha />
        </section>
      </div>
    </>
  );
}

function Mesas() {
  const lista = useConsulta("ajustes:mesas", (s) =>
    mesas.listar({ tamanhoPagina: 100 }, s),
  );
  const { executar, ocupado, erros } = useAcao();
  const [numero, setNumero] = useState("");

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    if (
      await executar(
        () => mesas.criar({ numero: Number(numero) }),
        `Mesa ${numero} criada`,
      )
    ) {
      setNumero("");
      lista.recarregar();
    }
  }

  return (
    <section aria-labelledby="h-mesas" className="ui-cartao ui-painel-metade">
      <h2 id="h-mesas" className="ui-titulo-secao">
        Mesas
      </h2>
      <p className="ui-texto-sm ui-suave">
        Mesa inativa some da tela de mesas e não recebe pedidos novos.
      </p>
      {lista.erro ? (
        <ErroAoCarregar erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
      ) : !lista.dados ? (
        <Esqueleto linhas={2} altura={56} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 8,
          }}
        >
          {lista.dados.dados.map((m) => (
            <label
              key={m.id}
              className="ui-opcao"
              style={{ justifyContent: "space-between" }}
            >
              <span style={{ font: "600 20px/24px var(--font-display)" }}>
                {m.numero}
              </span>
              <span className="ui-linha" style={{ gap: 6 }}>
                <span className="ui-texto-sm ui-suave">
                  {m.ativa ? "ativa" : "inativa"}
                </span>
                <input
                  type="checkbox"
                  checked={m.ativa}
                  aria-label={`Mesa ${m.numero} ativa`}
                  onChange={async (e) => {
                    if (
                      await executar(() =>
                        mesas.atualizar(m.id, { ativa: e.target.checked }),
                      )
                    )
                      lista.recarregar();
                  }}
                />
              </span>
            </label>
          ))}
        </div>
      )}
      <form
        className="ui-linha"
        style={{ alignItems: "flex-end" }}
        onSubmit={criar}
        noValidate
      >
        <Campo rotulo="Número da nova mesa" erro={erros.numero}>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            style={{ width: 160 }}
            className="sc-input sc-tnum"
          />
        </Campo>
        <Botao
          type="submit"
          variante="fantasma"
          carregando={ocupado}
          disabled={!(Number(numero) > 0)}
        >
          Criar mesa
        </Botao>
      </form>
    </section>
  );
}

/**
 * Lista curta que só cadastra (formas de pagamento, cargos). Renomear e
 * remover são raros e ficam na API: os cargos-base não mudam, e o que já foi
 * usado em pedidos ou vínculos fica como histórico.
 */
function ListaSimples<T extends { id: number; nome: string }>({
  titulo,
  chave,
  listar,
  criar,
  rotulo,
  dica,
}: {
  titulo: string;
  chave: string;
  listar(sinal: AbortSignal): Promise<{ dados: T[] }>;
  criar(nome: string): Promise<unknown>;
  rotulo(item: T): string;
  dica: string;
}) {
  const lista = useConsulta(`ajustes:${chave}`, listar);
  const { executar, ocupado, erros } = useAcao();
  const [nome, setNome] = useState("");
  return (
    <section aria-label={titulo} className="ui-cartao">
      <h2 className="ui-titulo-secao">{titulo}</h2>
      <div className="ui-linha ui-linha--quebra">
        {lista.dados?.dados.map((i) => (
          <span key={i.id} className="sc-chip" style={{ cursor: "default" }}>
            {rotulo(i)}
          </span>
        ))}
      </div>
      <form
        className="ui-linha"
        style={{ alignItems: "flex-end" }}
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await executar(
              () => criar(nome.trim()),
              `${titulo}: “${nome.trim()}” criado`,
            )
          ) {
            setNome("");
            lista.recarregar();
          }
        }}
      >
        <Campo
          rotulo="Novo"
          erro={erros.nome}
          ajuda={dica}
          className="ui-coluna"
        >
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Botao
          type="submit"
          variante="fantasma"
          carregando={ocupado}
          disabled={nome.trim().length < 2}
        >
          Criar
        </Botao>
      </form>
    </section>
  );
}
