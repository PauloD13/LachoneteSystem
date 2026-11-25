import { NavLink, Outlet } from "react-router";
import { Icone, type NomeDoIcone } from "../ui/Icone";
import estilos from "./Layouts.module.css";

interface ItemDeNavegacao {
  para: string;
  rotulo: string;
  icone: NomeDoIcone;
}

const NAVEGACOES: Record<"atendente" | "entregador", ItemDeNavegacao[]> = {
  atendente: [
    { para: "/inicio", rotulo: "Início", icone: "inicio" },
    { para: "/pedidos", rotulo: "Pedidos", icone: "pedidos" },
    { para: "/pedidos/novo", rotulo: "Novo", icone: "mais" },
    { para: "/mesas", rotulo: "Mesas", icone: "mesa" },
    { para: "/mais", rotulo: "Mais", icone: "reticencias" },
  ],
  entregador: [
    { para: "/entregas", rotulo: "Entregas", icone: "moto" },
    { para: "/entregas/historico", rotulo: "Histórico", icone: "historico" },
    { para: "/perfil", rotulo: "Perfil", icone: "pessoa" },
  ],
};

interface Props {
  /** Navegação inferior em pílula; sem ela, a tela tem o próprio rodapé. */
  navegacao?: keyof typeof NAVEGACOES;
}

/**
 * Moldura das telas de celular (atendente e entregador): uma coluna de até
 * 560px, centralizada em telas maiores, com a navegação inferior.
 */
export function LayoutCelular({ navegacao }: Props) {
  return (
    <div className={estilos.celular}>
      <Outlet />
      {navegacao && (
        <nav aria-label="Navegação principal" className={estilos.navInferior}>
          <ul>
            {NAVEGACOES[navegacao].map((item) => (
              <li key={item.para}>
                <NavLink to={item.para} end>
                  <Icone nome={item.icone} tamanho={22} />
                  {item.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
