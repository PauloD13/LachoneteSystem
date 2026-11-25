import { useState } from "react";
import { Folha } from "../ui/Folha";
import { Icone } from "../ui/Icone";
import { Botao } from "../ui/Botao";
import { Esqueleto, ErroAoCarregar, Vazio } from "../ui/Estados";
import { FormCliente } from "./FormCliente";
import { useConsulta } from "../../hooks/useConsulta";
import { clientes } from "../../services/cadastros";
import { telefone } from "../../lib/formatadores";
import { enderecoDoCliente } from "../../lib/clientes";
import type { Cliente } from "../../types/dominio";

interface Props {
  aberta: boolean;
  aoFechar(): void;
  aoEscolher(cliente: Cliente): void;
  /** Mostra "Sem cliente" (balcão). */
  aoRemover?(): void;
  /** Para entrega: o cadastro novo exige endereço. */
  exigirEndereco?: boolean;
}

/** Busca e escolhe o cliente do pedido (ou cadastra na hora). */
export function FolhaCliente({
  aberta,
  aoFechar,
  aoEscolher,
  aoRemover,
  exigirEndereco,
}: Props) {
  const [busca, setBusca] = useState("");
  const [cadastrando, setCadastrando] = useState(false);
  const termo = busca.trim();

  const lista = useConsulta(`folha-cliente:${aberta}:${termo}`, (sinal) =>
    aberta
      ? clientes.listar({ busca: termo || undefined, tamanhoPagina: 20 }, sinal)
      : Promise.resolve(undefined),
  );

  function fechar() {
    setCadastrando(false);
    setBusca("");
    aoFechar();
  }

  return (
    <Folha
      aberta={aberta}
      aoFechar={fechar}
      titulo={cadastrando ? "Novo cliente" : "Cliente do pedido"}
      largura={620}
    >
      {cadastrando ? (
        <FormCliente
          exigirEndereco={exigirEndereco}
          aoCancelar={() => setCadastrando(false)}
          aoSalvar={(c) => {
            aoEscolher(c);
            fechar();
          }}
        />
      ) : (
        <>
          <label className="ui-busca">
            <span className="sr-only">Buscar cliente</span>
            <Icone nome="busca" />
            <input
              className="sc-input"
              placeholder="Nome ou telefone"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
          <div className="ui-linha ui-linha--quebra">
            <Botao variante="fantasma" onClick={() => setCadastrando(true)}>
              <Icone nome="mais" />
              Cadastrar cliente
            </Botao>
            {aoRemover && (
              <Botao
                variante="fantasma"
                onClick={() => {
                  aoRemover();
                  fechar();
                }}
              >
                Sem cliente
              </Botao>
            )}
          </div>
          {lista.erro ? (
            <ErroAoCarregar
              erro={lista.erro}
              aoTentarDeNovo={lista.recarregar}
            />
          ) : !lista.dados ? (
            <Esqueleto linhas={3} altura={56} />
          ) : lista.dados.dados.length === 0 ? (
            <Vazio icone="pessoa">Nenhum cliente encontrado.</Vazio>
          ) : (
            <ul
              className="ui-coluna"
              style={{ listStyle: "none", margin: 0, padding: 0, gap: 6 }}
            >
              {lista.dados.dados.map((c) => {
                const endereco = enderecoDoCliente(c);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="ui-opcao"
                      style={{
                        width: "100%",
                        border: 0,
                        textAlign: "left",
                        padding: "10px 14px",
                      }}
                      onClick={() => {
                        aoEscolher(c);
                        fechar();
                      }}
                    >
                      <span className="ui-avatar" aria-hidden="true">
                        {c.nome.charAt(0).toUpperCase()}
                      </span>
                      <span className="ui-coluna" style={{ gap: 0, flex: 1 }}>
                        <span>{c.nome}</span>
                        <span className="ui-texto-sm ui-suave">
                          {telefone(c.telefone)}
                          {endereco ? ` · ${endereco}` : " · sem endereço"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Folha>
  );
}
