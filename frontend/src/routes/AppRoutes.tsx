import { Navigate, Outlet, Route, Routes } from "react-router";
import { RotaProtegida } from "./RotaProtegida";
import { ExigeCargo } from "./ExigeCargo";
import { InicialPorCargo } from "./InicialPorCargo";
import { LayoutCelular } from "../components/layout/LayoutCelular";
import { LayoutGerencia } from "../components/layout/LayoutGerencia";
import { LoginPage } from "../pages/LoginPage";
import { NaoEncontradaPage } from "../pages/NaoEncontradaPage";
import { InicioPage } from "../pages/atendente/InicioPage";
import { NovoPedidoPage } from "../pages/atendente/NovoPedidoPage";
import { FechamentoPage } from "../pages/atendente/FechamentoPage";
import { PedidosPage } from "../pages/atendente/PedidosPage";
import { PedidoPage } from "../pages/atendente/PedidoPage";
import { MesasPage } from "../pages/atendente/MesasPage";
import { CozinhaPage } from "../pages/cozinha/CozinhaPage";
import { EntregasPage } from "../pages/entregador/EntregasPage";
import { HistoricoEntregasPage } from "../pages/entregador/HistoricoEntregasPage";
import { PerfilPage } from "../pages/conta/PerfilPage";
import { ClientesPage } from "../pages/gerencia/ClientesPage";
import { CardapioPage } from "../pages/gerencia/CardapioPage";
import { EstoquePage } from "../pages/gerencia/EstoquePage";
import { RelatoriosPage } from "../pages/gerencia/RelatoriosPage";
import { EquipePage } from "../pages/gerencia/EquipePage";
import { AjustesPage } from "../pages/gerencia/AjustesPage";

// Telas de largura total abertas fora da gerência (ex.: Clientes para o
// atendente) ganham as mesmas margens do conteúdo da gerência.
function PaginaLarga() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: "20px 16px",
      }}
    >
      <Outlet />
    </main>
  );
}

// Mapa de telas. Operação: qualquer funcionário logado (quem pode ser
// atendente/entregador de um pedido o backend confere pelo cargo).
// Gerência: só gerente.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RotaProtegida />}>
        <Route index element={<InicialPorCargo />} />

        {/* Atendente (celular, com navegação inferior) */}
        <Route element={<LayoutCelular navegacao="atendente" />}>
          <Route path="inicio" element={<InicioPage />} />
          <Route path="pedidos" element={<PedidosPage />} />
          <Route path="pedidos/novo" element={<NovoPedidoPage />} />
          <Route path="mesas" element={<MesasPage />} />
          <Route path="mais" element={<PerfilPage titulo="Mais" />} />
          <Route element={<PaginaLarga />}>
            <Route path="clientes" element={<ClientesPage />} />
          </Route>
        </Route>

        {/* Telas com rodapé de ação próprio (sem navegação) */}
        <Route element={<LayoutCelular />}>
          <Route path="pedidos/novo/fechar" element={<FechamentoPage />} />
          <Route path="pedidos/:id" element={<PedidoPage />} />
        </Route>

        {/* Cozinha (tablet) */}
        <Route path="cozinha" element={<CozinhaPage />} />

        {/* Entregador */}
        <Route element={<LayoutCelular navegacao="entregador" />}>
          <Route path="entregas" element={<EntregasPage />} />
          <Route
            path="entregas/historico"
            element={<HistoricoEntregasPage />}
          />
          <Route path="perfil" element={<PerfilPage />} />
        </Route>

        {/* Gerência (desktop) */}
        <Route element={<ExigeCargo cargos={["gerente"]} />}>
          <Route path="gerencia" element={<LayoutGerencia />}>
            <Route index element={<Navigate to="pedidos" replace />} />
            <Route path="pedidos" element={<PedidosPage largo />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="cardapio" element={<CardapioPage />} />
            <Route path="estoque" element={<EstoquePage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="equipe" element={<EquipePage />} />
            <Route path="ajustes" element={<AjustesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NaoEncontradaPage />} />
      </Route>
    </Routes>
  );
}
