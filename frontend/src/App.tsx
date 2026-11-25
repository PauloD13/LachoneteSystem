import { AppRoutes } from "./routes/AppRoutes";
import { CarrinhoProvider } from "./contexts/CarrinhoProvider";
import { useAuth } from "./hooks/useAuth";

function App() {
  const { usuario } = useAuth();
  // Um carrinho por pessoa: ao trocar de usuário, o pedido em montagem do
  // anterior não aparece para o próximo (ver também AuthProvider.sair).
  return (
    <CarrinhoProvider key={usuario?.id ?? 0}>
      <AppRoutes />
    </CarrinhoProvider>
  );
}

export default App;
