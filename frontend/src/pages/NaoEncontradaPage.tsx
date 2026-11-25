import { Link } from "react-router";

export function NaoEncontradaPage() {
  return (
    <section>
      <h1>Página não encontrada</h1>
      <p>
        <Link to="/">Voltar para o início</Link>
      </p>
    </section>
  );
}
