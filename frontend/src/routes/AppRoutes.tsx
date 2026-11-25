import { Route, Routes } from "react-router";
import { RotaProtegida } from "./RotaProtegida";
import { ExigeCargo } from "./ExigeCargo";
import { LayoutPrincipal } from "../components/LayoutPrincipal";
import { LoginPage } from "../pages/LoginPage";
import { InicioPage } from "../pages/InicioPage";
import { NaoEncontradaPage } from "../pages/NaoEncontradaPage";

// Mapa de telas do sistema. Para adicionar uma tela nova:
//   1. crie o componente em pages/;
//   2. registre a rota aqui, dentro do grupo de permissão certo;
//   3. adicione o link no menu (components/LayoutPrincipal.tsx).
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Tudo daqui para baixo exige login. */}
      <Route element={<RotaProtegida />}>
        <Route element={<LayoutPrincipal />}>
          <Route index element={<InicioPage />} />

          {/* Operação: qualquer funcionário logado (pedidos, clientes). */}

          {/* Gestão: cadastros e relatórios. */}
          <Route element={<ExigeCargo cargos={["gerente"]} />}>
            {/* ex.: <Route path="relatorios" element={<RelatoriosPage />} /> */}
          </Route>

          <Route path="*" element={<NaoEncontradaPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
