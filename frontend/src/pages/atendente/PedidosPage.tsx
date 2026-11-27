import { useState } from "react";
import { useConsulta } from "../../hooks/useConsulta";
import { usePeriodico } from "../../hooks/usePeriodico";
import { useAoVivo } from "../../hooks/useAoVivo";
import { pedidos, type FiltrosDePedido } from "../../services/pedidos";
import { Chip } from "../../components/ui/Chip";
import { Icone } from "../../components/ui/Icone";
import { Paginacao } from "../../components/ui/Paginacao";
import { ErroAoCarregar, Esqueleto, Vazio } from "../../components/ui/Estados";
import { CartaoPedido } from "../../components/pedido/CartaoPedido";
import { hojeISO } from "../../lib/formatadores";
import { STATUS_EM_ABERTO } from "../../lib/status";
import estilos from "./Atendente.module.css";

type Filtro = "abertos" | "finalizados" | "cancelados" | "todos";

const STATUS_DO_FILTRO: Record<Filtro, FiltrosDePedido["status"]> = {
  abertos: STATUS_EM_ABERTO,
  finalizados: "ENTREGUE_RETIRADO",
  cancelados: "CANCELADO",
  todos: undefined,
};

/**
 * Tela 6 — Pedidos (atendente no celular; gerente no desktop, com
 * `largo`): busca, filtros e cartões com a listra do status.
 */
export function PedidosPage({ largo = false }: { largo?: boolean }) {
  const [filtro, setFiltro] = useState<Filtro>("abertos");
  const [soHoje, setSoHoje] = useState(true);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const termo = busca.trim();
  const hoje = hojeISO();

  const filtros: FiltrosDePedido = {
    status: STATUS_DO_FILTRO[filtro],
    // Em aberto mostra tudo o que não terminou, seja de que dia for.
    dataInicio: soHoje && filtro !== "abertos" ? hoje : undefined,
    busca: termo || undefined,
    ordem: filtro === "abertos" ? "antigos" : "recentes",
    pagina,
    tamanhoPagina: largo ? 30 : 20,
  };
  const lista = useConsulta(`pedidos:${JSON.stringify(filtros)}`, (sinal) =>
    pedidos.listar(filtros, sinal),
  );
  const contagemAbertos = useConsulta("pedidos:contagem", (sinal) =>
    pedidos.listar({ status: STATUS_EM_ABERTO, tamanhoPagina: 1 }, sinal),
  );
  const recarregar = () => {
    lista.recarregar();
    contagemAbertos.recarregar();
  };
  // Com a conexão em tempo real aberta, a consulta periódica é só reserva.
  const aoVivo = useAoVivo(recarregar);
  usePeriodico(recarregar, aoVivo ? 120000 : 30000);

  const mudarFiltro = (f: Filtro) => {
    setFiltro(f);
    setPagina(1);
  };

  const cabecalho = (
    <>
      <div className="ui-linha ui-linha--entre">
        <h1 className="ui-titulo-pagina">Pedidos</h1>
        {filtro !== "abertos" && (
          <Chip
            selecionado={soHoje}
            onClick={() => setSoHoje((v) => !v)}
            style={{ gap: 6 }}
          >
            <Icone nome="relogio" tamanho={18} />
            Hoje
          </Chip>
        )}
      </div>
      <label className="ui-busca">
        <span className="sr-only">Buscar pedido</span>
        <Icone nome="busca" />
        <input
          className="sc-input"
          type="search"
          placeholder="Nº do pedido ou cliente"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPagina(1);
          }}
        />
      </label>
      <div className="ui-faixa" role="group" aria-label="Filtrar pedidos">
        <Chip
          selecionado={filtro === "abertos"}
          onClick={() => mudarFiltro("abertos")}
        >
          Em aberto
          {contagemAbertos.dados
            ? ` · ${contagemAbertos.dados.paginacao.total}`
            : ""}
        </Chip>
        <Chip
          selecionado={filtro === "finalizados"}
          onClick={() => mudarFiltro("finalizados")}
        >
          Finalizados
        </Chip>
        <Chip
          selecionado={filtro === "cancelados"}
          onClick={() => mudarFiltro("cancelados")}
        >
          Cancelados
        </Chip>
        <Chip
          selecionado={filtro === "todos"}
          onClick={() => mudarFiltro("todos")}
        >
          Todos
        </Chip>
      </div>
    </>
  );

  const conteudo = lista.erro ? (
    <ErroAoCarregar erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
  ) : !lista.dados ? (
    <Esqueleto linhas={4} altura={96} rotulo="Carregando pedidos" />
  ) : lista.dados.dados.length === 0 ? (
    <Vazio icone="pedidos">
      {termo
        ? "Nenhum pedido encontrado."
        : filtro === "abertos"
          ? "Nenhum pedido em aberto."
          : "Nenhum pedido aqui."}
    </Vazio>
  ) : (
    <>
      <div
        className="sc-screen-enter"
        key={filtro}
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: largo
            ? "repeat(auto-fill, minmax(300px, 1fr))"
            : "1fr",
        }}
      >
        {lista.dados.dados.map((p) => (
          <CartaoPedido key={p.id} pedido={p} />
        ))}
      </div>
      <Paginacao paginacao={lista.dados.paginacao} aoMudar={setPagina} />
    </>
  );

  if (largo) {
    return (
      <>
        <header className="ui-coluna">{cabecalho}</header>
        {conteudo}
      </>
    );
  }
  return (
    <>
      <header
        className={`${estilos.cabecalho} ${estilos.cabecalhoFixo}`}
        style={{ gap: 12 }}
      >
        {cabecalho}
      </header>
      <main className={estilos.conteudo} style={{ gap: 12 }}>
        {conteudo}
      </main>
    </>
  );
}
