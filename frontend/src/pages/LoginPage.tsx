import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import type { Location } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { mensagemDeErro } from "../services/api";
import estilos from "./LoginPage.module.css";

// PROVISÓRIO no visual; o comportamento (enviar, mostrar erro, voltar para
// a tela de origem) é o que a versão do protótipo deve manter.
export function LoginPage() {
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Tela de onde o usuário foi mandado para o login (ver RotaProtegida).
  const destino =
    (local.state as { de?: Location } | null)?.de?.pathname ?? "/";

  if (usuario) return <Navigate to={destino} replace />;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(login, senha);
      navegar(destino, { replace: true });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className={estilos.pagina}>
      <form className={estilos.cartao} onSubmit={enviar} noValidate>
        <h1>Lanchonete Sabor &amp; Cia</h1>

        <label htmlFor="login">Login</label>
        <input
          id="login"
          name="login"
          autoComplete="username"
          required
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />

        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        {erro && (
          <p role="alert" className={estilos.erro}>
            {erro}
          </p>
        )}

        <button type="submit" disabled={enviando || !login || !senha}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
