import { NavLink, Outlet } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { useConsulta } from "../../hooks/useConsulta";
import { usePeriodico } from "../../hooks/usePeriodico";
import { ingredientes } from "../../services/cadastros";
import { Icone, type NomeDoIcone } from "../ui/Icone";
import { primeiroNome } from "../../lib/formatadores";
import estilos from "./Layouts.module.css";

interface Item {
  para: string;
  rotulo: string;
  icone: NomeDoIcone;
}

const GESTAO: Item[] = [
  { para: "/gerencia/pedidos", rotulo: "Pedidos", icone: "pedidos" },
  { para: "/gerencia/clientes", rotulo: "Clientes", icone: "pessoas" },
  { para: "/gerencia/cardapio", rotulo: "Cardápio", icone: "cardapio" },
  { para: "/gerencia/estoque", rotulo: "Estoque", icone: "estoque" },
  { para: "/gerencia/relatorios", rotulo: "Relatórios", icone: "grafico" },
  { para: "/gerencia/equipe", rotulo: "Equipe", icone: "pessoa" },
  { para: "/gerencia/ajustes", rotulo: "Ajustes", icone: "ajustes" },
];

// O gerente também opera: atalhos para as telas do dia a dia.
const OPERACAO: Item[] = [
  { para: "/pedidos/novo", rotulo: "Novo pedido", icone: "mais" },
  { para: "/cozinha", rotulo: "Cozinha", icone: "panela" },
  { para: "/mesas", rotulo: "Mesas", icone: "mesa" },
  { para: "/entregas", rotulo: "Entregas", icone: "moto" },
];

function Itens({
  itens,
  contadores = {},
}: {
  itens: Item[];
  contadores?: Record<string, number>;
}) {
  return (
    <ul>
      {itens.map((item) => {
        const n = contadores[item.para] ?? 0;
        return (
          <li key={item.para}>
            <NavLink to={item.para}>
              <Icone nome={item.icone} />
              {item.rotulo}
              {n > 0 && (
                <span className={estilos.contador}>
                  {n}
                  <span className="sr-only"> para repor</span>
                </span>
              )}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

/** Moldura da gerência: menu lateral no desktop, faixa no topo no celular. */
export function LayoutGerencia() {
  const { usuario, sair } = useAuth();
  // Alerta de estoque mínimo visível de qualquer tela da gerência.
  const aRepor = useConsulta("menu:repor", (s) =>
    ingredientes.listar({ repor: true, tamanhoPagina: 1 }, s),
  );
  usePeriodico(aRepor.recarregar, 60000);
  const contadores = {
    "/gerencia/estoque": aRepor.dados?.paginacao.total ?? 0,
  };
  return (
    <div className={estilos.gerencia}>
      <nav aria-label="Menu da gerência" className={estilos.menuLateral}>
        <span className={estilos.marca}>Sabor &amp; Cia</span>
        <Itens itens={GESTAO} contadores={contadores} />
        <span className={estilos.grupoMenu}>Operação</span>
        <Itens itens={OPERACAO} />
        <div className={estilos.rodapeMenu}>
          <span>{primeiroNome(usuario?.nome)} · gerente</span>
          <button
            type="button"
            className="ui-link"
            onClick={sair}
            aria-label="Sair do sistema"
          >
            Sair
          </button>
        </div>
      </nav>
      <main className={estilos.conteudoGerencia}>
        <Outlet />
      </main>
    </div>
  );
}
