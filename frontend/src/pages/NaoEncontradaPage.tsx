import { Link } from "react-router";
import { Vazio } from "../components/ui/Estados";

export function NaoEncontradaPage() {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "48px 16px" }}>
      <h1 className="ui-titulo-pagina" style={{ textAlign: "center" }}>
        Página não encontrada
      </h1>
      <Vazio
        icone="alerta"
        acao={
          <Link to="/" className="sc-btn sc-btn--primary">
            Voltar para o início
          </Link>
        }
      >
        O endereço não existe ou mudou.
      </Vazio>
    </main>
  );
}
