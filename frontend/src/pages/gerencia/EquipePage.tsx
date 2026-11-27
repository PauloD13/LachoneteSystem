import { useState, type FormEvent } from "react";
import { useConsulta } from "../../hooks/useConsulta";
import { useSelecaoNaLista } from "../../hooks/useSelecaoNaLista";
import { useAcao } from "../../hooks/useAcao";
import {
  cargos,
  funcionarios,
  vinculosDeCargo,
} from "../../services/cadastros";
import { Botao } from "../../components/ui/Botao";
import { Campo } from "../../components/ui/Campo";
import { Chip } from "../../components/ui/Chip";
import { Icone } from "../../components/ui/Icone";
import { ErroAoCarregar, Esqueleto, Vazio } from "../../components/ui/Estados";
import { textoOuNulo } from "../../lib/formularios";
import { dia, hojeISO, inicial } from "../../lib/formatadores";
import type { Funcionario, FuncionarioEntrada } from "../../types/dominio";

/**
 * Proposta — Equipe: cadastro de funcionários, acesso ao sistema (login e
 * senha) e histórico de cargos. Não estava no protótipo; segue o mesmo
 * padrão das outras telas da gerência.
 */
export function EquipePage() {
  const [soAtivos, setSoAtivos] = useState(true);
  const [novo, setNovo] = useState(false);
  const lista = useConsulta(`equipe:${soAtivos}`, (s) =>
    funcionarios.listar(
      { ativo: soAtivos ? true : undefined, tamanhoPagina: 100 },
      s,
    ),
  );
  const { atual, selecionar, aposSalvar } = useSelecaoNaLista(
    lista.dados?.dados,
    lista.carregando,
  );

  return (
    <>
      <header className="ui-cabecalho-gerencia">
        <div className="ui-coluna" style={{ gap: 0 }}>
          <h1>Equipe</h1>
          <span
            className="ui-suave"
            style={{ font: "600 15px/22px var(--font-sans)" }}
          >
            Quem trabalha, com que cargo e quem entra no sistema
          </span>
        </div>
        <Botao variante="primario" onClick={() => setNovo(true)}>
          <Icone nome="mais" />
          Novo funcionário
        </Botao>
      </header>
      <div className="ui-paineis">
        <section
          aria-label="Funcionários"
          className="ui-cartao ui-painel-metade"
          style={{ gap: 8 }}
        >
          <div className="ui-linha" role="group" aria-label="Filtrar">
            <Chip selecionado={soAtivos} onClick={() => setSoAtivos(true)}>
              Ativos
            </Chip>
            <Chip selecionado={!soAtivos} onClick={() => setSoAtivos(false)}>
              Todos
            </Chip>
          </div>
          {lista.erro ? (
            <ErroAoCarregar
              erro={lista.erro}
              aoTentarDeNovo={lista.recarregar}
            />
          ) : !lista.dados ? (
            <Esqueleto linhas={4} altura={52} />
          ) : lista.dados.dados.length === 0 ? (
            <Vazio icone="pessoas">Ninguém aqui.</Vazio>
          ) : (
            lista.dados.dados.map((f) => (
              <button
                key={f.id}
                type="button"
                className="ui-item-lista"
                aria-current={atual?.id === f.id && !novo}
                onClick={() => {
                  setNovo(false);
                  selecionar(f.id);
                }}
              >
                <span
                  className="ui-avatar"
                  aria-hidden="true"
                  style={{ background: "var(--surface-inset)" }}
                >
                  {inicial(f.nome)}
                </span>
                <span
                  className="ui-coluna"
                  style={{ gap: 0, flex: 1, minWidth: 0 }}
                >
                  <span style={{ fontWeight: 800 }}>{f.nome}</span>
                  <span className="ui-texto-sm ui-suave">
                    {f.cargos.join(" · ") || "sem cargo vigente"}
                    {f.login ? ` · login ${f.login}` : " · sem acesso"}
                  </span>
                </span>
                {!f.ativo && (
                  <span
                    className="ui-texto-sm"
                    style={{ color: "var(--danger-text)" }}
                  >
                    Inativo
                  </span>
                )}
              </button>
            ))
          )}
        </section>
        {(novo || atual) && (
          <EditorFuncionario
            key={novo ? "novo" : atual!.id}
            funcionario={novo ? null : atual}
            aoSalvar={(f) => {
              setNovo(false);
              aposSalvar(f);
              lista.recarregar();
            }}
          />
        )}
      </div>
    </>
  );
}

function EditorFuncionario({
  funcionario,
  aoSalvar,
}: {
  funcionario: Funcionario | null;
  aoSalvar(f: Funcionario): void;
}) {
  const { executar, ocupado, erros } = useAcao();
  const [nome, setNome] = useState(funcionario?.nome ?? "");
  const [tel, setTel] = useState(funcionario?.telefone ?? "");
  const [email, setEmail] = useState(funcionario?.email ?? "");
  const [login, setLogin] = useState(funcionario?.login ?? "");
  const [senha, setSenha] = useState("");

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const corpo: FuncionarioEntrada = {
      nome: nome.trim(),
      telefone: textoOuNulo(tel),
      email: textoOuNulo(email),
      login: textoOuNulo(login.toLowerCase()),
      ...(senha ? { senha } : {}),
    };
    let salvo: Funcionario | undefined;
    const ok = await executar(
      async () => {
        salvo = funcionario
          ? await funcionarios.atualizar(funcionario.id, corpo)
          : await funcionarios.criar(corpo);
      },
      funcionario ? "Funcionário salvo" : "Funcionário cadastrado",
    );
    if (ok && salvo) {
      setSenha("");
      aoSalvar(salvo);
    }
  }

  async function alternarAtivo() {
    if (!funcionario) return;
    let salvo: Funcionario | undefined;
    if (
      (await executar(
        async () => {
          salvo = await funcionarios.atualizar(funcionario.id, {
            ativo: !funcionario.ativo,
          });
        },
        funcionario.ativo
          ? "Funcionário desativado (perdeu o acesso)"
          : "Funcionário reativado",
      )) &&
      salvo
    )
      aoSalvar(salvo);
  }

  return (
    <section
      aria-labelledby="h-func"
      className="ui-cartao ui-painel-metade sc-screen-enter"
      style={{ gap: 18, padding: 20 }}
    >
      <h2 id="h-func" style={{ font: "600 24px/30px var(--font-display)" }}>
        {funcionario ? funcionario.nome : "Novo funcionário"}
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
          <Campo
            rotulo="Login (opcional)"
            erro={erros.login}
            ajuda="Sem login, a pessoa não entra no sistema."
          >
            <input
              autoComplete="off"
              autoCapitalize="none"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="ex.: ana.lima"
            />
          </Campo>
          <Campo
            rotulo={
              funcionario?.login ? "Nova senha (para redefinir)" : "Senha"
            }
            erro={erros.senha}
            ajuda="Mínimo de 8 caracteres."
          >
            <input
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </Campo>
        </div>
        <div className="ui-linha" style={{ justifyContent: "flex-end" }}>
          {funcionario && (
            <Botao
              variante="fantasma"
              onClick={alternarAtivo}
              disabled={ocupado}
            >
              {funcionario.ativo ? "Desativar" : "Reativar"}
            </Botao>
          )}
          <Botao
            type="submit"
            variante="primario"
            carregando={ocupado}
            textoCarregando="Salvando…"
          >
            {funcionario ? "Salvar alterações" : "Cadastrar"}
          </Botao>
        </div>
      </form>
      {funcionario ? (
        <Cargos
          funcionarioId={funcionario.id}
          aoMudar={() => aoSalvar(funcionario)}
        />
      ) : (
        <p className="ui-texto-sm ui-suave">
          Depois de cadastrar, defina os cargos (atendente, cozinheiro...).
        </p>
      )}
    </section>
  );
}

function Cargos({
  funcionarioId,
  aoMudar,
}: {
  funcionarioId: number;
  aoMudar(): void;
}) {
  const { executar, ocupado } = useAcao();
  const historico = useConsulta(`vinculos:${funcionarioId}`, (s) =>
    vinculosDeCargo.listar(funcionarioId, s),
  );
  const lista = useConsulta("cargos", (s) =>
    cargos.listar({ tamanhoPagina: 100 }, s),
  );
  const [cargoId, setCargoId] = useState("");
  const [inicio, setInicio] = useState(hojeISO());

  const abertos = historico.dados?.filter((v) => v.dataFim === null) ?? [];
  const encerrados = historico.dados?.filter((v) => v.dataFim !== null) ?? [];

  async function abrir(evento: FormEvent) {
    evento.preventDefault();
    if (
      await executar(
        () => vinculosDeCargo.abrir(funcionarioId, Number(cargoId), inicio),
        "Cargo atribuído",
      )
    ) {
      setCargoId("");
      historico.recarregar();
      aoMudar();
    }
  }

  return (
    <div className="ui-coluna" style={{ gap: 8 }}>
      <h3 style={{ font: "800 15px/20px var(--font-sans)" }}>Cargos</h3>
      {historico.erro ? (
        <ErroAoCarregar
          erro={historico.erro}
          aoTentarDeNovo={historico.recarregar}
        />
      ) : !historico.dados ? (
        <Esqueleto linhas={1} altura={44} rotulo="Carregando cargos" />
      ) : (
        abertos.length === 0 && (
          <p className="ui-texto-sm ui-suave">Nenhum cargo vigente.</p>
        )
      )}
      {abertos.map((v) => (
        <div
          key={v.id}
          className="ui-linha ui-bloco"
          style={{ padding: "6px 6px 6px 14px" }}
        >
          <span style={{ flex: 1, fontWeight: 800 }}>{v.cargo.nome}</span>
          <span className="ui-texto-sm ui-suave">
            desde {dia(v.dataInicio)}
          </span>
          <Botao
            variante="fantasma"
            style={{ minHeight: 40 }}
            onClick={async () => {
              if (
                await executar(
                  () => vinculosDeCargo.encerrar(funcionarioId, v.id),
                  `Cargo ${v.cargo.nome} encerrado`,
                )
              ) {
                historico.recarregar();
                aoMudar();
              }
            }}
          >
            Encerrar
          </Botao>
        </div>
      ))}
      <form
        className="ui-linha ui-linha--quebra"
        style={{ alignItems: "flex-end" }}
        onSubmit={abrir}
        noValidate
      >
        <Campo rotulo="Novo cargo">
          <select
            value={cargoId}
            onChange={(e) => setCargoId(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="">Escolha…</option>
            {lista.dados?.dados
              .filter((c) => !abertos.some((v) => v.cargoId === c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
          </select>
        </Campo>
        <Campo rotulo="A partir de">
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </Campo>
        <Botao
          type="submit"
          variante="fantasma"
          carregando={ocupado}
          disabled={!cargoId}
        >
          Atribuir
        </Botao>
      </form>
      {encerrados.length > 0 && (
        <details>
          <summary
            className="ui-texto-sm"
            style={{
              cursor: "pointer",
              minHeight: 44,
              display: "flex",
              alignItems: "center",
            }}
          >
            Histórico ({encerrados.length})
          </summary>
          {encerrados.map((v) => (
            <div key={v.id} className="ui-valor ui-texto-sm ui-valor--suave">
              <span>{v.cargo.nome}</span>
              <span>
                {dia(v.dataInicio)} – {dia(v.dataFim)}
              </span>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
