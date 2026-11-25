import { Folha } from "../ui/Folha";
import { Botao } from "../ui/Botao";
import { Esqueleto, ErroAoCarregar, Vazio } from "../ui/Estados";
import { useConsulta } from "../../hooks/useConsulta";
import { mesas } from "../../services/cadastros";
import { classeDaComanda, rotuloDoStatus } from "../../lib/status";
import type { Mesa } from "../../types/dominio";

interface Props {
  aberta: boolean;
  aoFechar(): void;
  aoEscolher(mesa: Mesa | null): void;
  mesaAtual?: number | null;
}

/** Escolhe a mesa do pedido (as ocupadas aparecem com o status). */
export function FolhaMesa({ aberta, aoFechar, aoEscolher, mesaAtual }: Props) {
  const lista = useConsulta(`folha-mesa:${aberta}`, (sinal) =>
    aberta
      ? mesas.listar({ ativa: true, tamanhoPagina: 100 }, sinal)
      : Promise.resolve(undefined),
  );
  return (
    <Folha
      aberta={aberta}
      aoFechar={aoFechar}
      titulo="Mesa do pedido"
      largura={620}
    >
      <Botao
        variante="fantasma"
        onClick={() => {
          aoEscolher(null);
          aoFechar();
        }}
      >
        Sem mesa (retirada ou entrega)
      </Botao>
      {lista.erro ? (
        <ErroAoCarregar erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
      ) : !lista.dados ? (
        <Esqueleto linhas={2} altura={88} />
      ) : lista.dados.dados.length === 0 ? (
        <Vazio icone="mesa">
          Nenhuma mesa ativa. O gerente cadastra as mesas em Ajustes.
        </Vazio>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
            gap: 10,
          }}
        >
          {lista.dados.dados.map((m) => {
            const aberto = m.pedidoAberto;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={m.id === mesaAtual}
                className={
                  aberto ? classeDaComanda(aberto.statusAtual) : "sc-ticket"
                }
                style={{
                  minHeight: 84,
                  padding: "10px 12px",
                  border: 0,
                  textAlign: "left",
                  cursor: "pointer",
                  color: "var(--ink)",
                  borderTopColor: aberto ? undefined : "transparent",
                  background:
                    m.id === mesaAtual ? "var(--surface-300)" : undefined,
                  outline:
                    m.id === mesaAtual ? "3px solid var(--ink)" : undefined,
                }}
                onClick={() => {
                  aoEscolher(m);
                  aoFechar();
                }}
              >
                <span
                  style={{
                    display: "block",
                    font: "600 22px/26px var(--font-display)",
                  }}
                >
                  {m.numero}
                </span>
                <span className="ui-texto-sm ui-suave">
                  {aberto
                    ? rotuloDoStatus(aberto.statusAtual, "CONSUMO_LOCAL")
                    : "Livre"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Folha>
  );
}
