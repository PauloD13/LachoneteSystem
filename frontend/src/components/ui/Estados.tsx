import type { ReactNode } from "react";
import { Icone, type NomeDoIcone } from "./Icone";
import { mensagemDeErro } from "../../services/api";

/** Blocos pulsando no formato do conteúdo (lista carregando). */
export function Esqueleto({
  linhas = 3,
  altura = 76,
  rotulo = "Carregando",
}: {
  linhas?: number;
  altura?: number;
  rotulo?: string;
}) {
  return (
    <div aria-busy="true" aria-label={rotulo} className="ui-coluna">
      {Array.from({ length: linhas }, (_, i) => (
        <div
          key={i}
          className="sc-skeleton"
          style={{ height: altura, borderRadius: "var(--radius-lg)" }}
        />
      ))}
    </div>
  );
}

export function Vazio({
  icone = "pedidos",
  children,
  acao,
}: {
  icone?: NomeDoIcone;
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="ui-vazio">
      <Icone nome={icone} tamanho={40} />
      <div>{children}</div>
      {acao}
    </div>
  );
}

/** Falha ao carregar, com o que fazer: tentar de novo. */
export function ErroAoCarregar({
  erro,
  aoTentarDeNovo,
}: {
  erro: unknown;
  aoTentarDeNovo?: () => void;
}) {
  return (
    <div className="ui-vazio" role="alert">
      <Icone nome="alerta" tamanho={40} />
      <div>{mensagemDeErro(erro)}</div>
      {aoTentarDeNovo && (
        <button
          type="button"
          className="sc-btn sc-btn--ghost"
          onClick={aoTentarDeNovo}
        >
          Tentar de novo
        </button>
      )}
    </div>
  );
}
