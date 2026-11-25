import { useAuth } from "../hooks/useAuth";

// PROVISÓRIO: tela inicial vazia até o protótipo.
export function InicioPage() {
  const { usuario } = useAuth();
  return (
    <section>
      <h1>Olá, {usuario?.nome}</h1>
      <p>Ambiente pronto. As telas entram conforme o protótipo.</p>
    </section>
  );
}
