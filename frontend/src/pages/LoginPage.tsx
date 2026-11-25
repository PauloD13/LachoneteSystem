import { useState, type FormEvent } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  type Location,
} from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useAvisos } from "../hooks/useAvisos";
import { ErroDaApi, mensagemDeErro } from "../services/api";
import { Botao } from "../components/ui/Botao";
import { Campo } from "../components/ui/Campo";
import { Icone } from "../components/ui/Icone";
import { primeiroNome, saudacao } from "../lib/formatadores";
import estilos from "./LoginPage.module.css";

/** Tela 1 — Login (todos os cargos). */
export function LoginPage() {
  const { usuario, entrar } = useAuth();
  const avisos = useAvisos();
  const navegar = useNavigate();
  const local = useLocation();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erros, setErros] = useState<{
    login?: string;
    senha?: string;
    geral?: string;
  }>({});
  const [enviando, setEnviando] = useState(false);

  // Tela de onde o usuário foi mandado para o login (ver RotaProtegida);
  // sem origem, "/" escolhe a tela inicial pelo cargo.
  const destino =
    (local.state as { de?: Location } | null)?.de?.pathname ?? "/";

  if (usuario && !enviando) return <Navigate to={destino} replace />;

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const novos = {
      login: login.trim() ? undefined : "Digite seu login para entrar.",
      senha: senha ? undefined : "Digite sua senha.",
    };
    setErros(novos);
    if (novos.login || novos.senha) return;

    setEnviando(true);
    try {
      const eu = await entrar(login.trim(), senha);
      avisos.sucesso(
        `${saudacao()}, ${primeiroNome(eu.nome)}! Seu turno começou.`,
      );
      navegar(destino, { replace: true });
    } catch (falha) {
      const mensagem =
        falha instanceof ErroDaApi && falha.status === 401
          ? "Login ou senha incorretos."
          : mensagemDeErro(falha);
      setErros({ geral: mensagem });
      setEnviando(false);
    }
  }

  return (
    <div className={`${estilos.pagina} sc-screen-enter`}>
      <svg className={estilos.enfeite} viewBox="0 0 390 300" aria-hidden="true">
        <circle cx="300" cy="40" r="150" fill="var(--brand)" />
        <rect
          x="-30"
          y="190"
          width="170"
          height="64"
          rx="32"
          fill="var(--mustard)"
        />
        <g fill="var(--brand-tint)">
          <rect
            x="250"
            y="20"
            width="22"
            height="10"
            rx="5"
            transform="rotate(-20 261 25)"
          />
          <rect
            x="320"
            y="50"
            width="22"
            height="10"
            rx="5"
            transform="rotate(25 331 55)"
          />
          <rect
            x="270"
            y="100"
            width="22"
            height="10"
            rx="5"
            transform="rotate(-10 281 105)"
          />
          <rect
            x="350"
            y="120"
            width="22"
            height="10"
            rx="5"
            transform="rotate(30 361 125)"
          />
          <rect
            x="215"
            y="70"
            width="22"
            height="10"
            rx="5"
            transform="rotate(15 226 75)"
          />
        </g>
      </svg>

      <main className={estilos.conteudo}>
        <div className="ui-coluna" style={{ gap: 6 }}>
          <h1 className={estilos.marca}>Sabor &amp; Cia</h1>
          <p
            className="ui-suave"
            style={{ font: "600 16px/24px var(--font-sans)" }}
          >
            Bom turno! Entre para começar a atender.
          </p>
        </div>

        <form className={estilos.cartao} onSubmit={enviar} noValidate>
          <Campo rotulo="Login" erro={erros.login}>
            <input
              name="login"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Ex.: ana.lima"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Senha" erro={erros.senha}>
            <SenhaComOlho
              valor={senha}
              aoMudar={setSenha}
              visivel={verSenha}
              aoAlternar={() => setVerSenha((v) => !v)}
            />
          </Campo>

          {erros.geral && (
            <p className="ui-erro" role="alert">
              {erros.geral}
            </p>
          )}

          <Botao
            type="submit"
            variante="primario"
            grande
            bloco
            carregando={enviando}
            textoCarregando="Entrando…"
          >
            Entrar
          </Botao>
          <p className={`${estilos.dica} ui-texto-sm ui-suave`}>
            Esqueceu a senha? Peça ao gerente para redefinir.
          </p>
        </form>
      </main>
    </div>
  );
}

// O Campo injeta id/aria-* no primeiro filho; aqui o filho é um invólucro
// que repassa essas props ao <input> de verdade.
function SenhaComOlho({
  valor,
  aoMudar,
  visivel,
  aoAlternar,
  ...aria
}: {
  valor: string;
  aoMudar(valor: string): void;
  visivel: boolean;
  aoAlternar(): void;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
}) {
  return (
    <span className={estilos.senha}>
      <input
        {...aria}
        className="sc-input"
        name="senha"
        type={visivel ? "text" : "password"}
        autoComplete="current-password"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
      />
      <button
        type="button"
        className={estilos.olho}
        onClick={aoAlternar}
        aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={visivel}
      >
        <Icone nome={visivel ? "olhoFechado" : "olho"} />
      </button>
    </span>
  );
}
