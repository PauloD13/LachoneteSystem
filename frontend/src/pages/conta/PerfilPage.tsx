import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { Icone, type NomeDoIcone } from "../../components/ui/Icone";
import { Folha } from "../../components/ui/Folha";
import { PreferenciaTema } from "../../components/conta/PreferenciaTema";
import { TrocarSenha } from "../../components/conta/TrocarSenha";
import { inicial } from "../../lib/formatadores";
import estilos from "../atendente/Atendente.module.css";

interface Atalho {
  para: string;
  rotulo: string;
  icone: NomeDoIcone;
  cargos: string[];
}

const ATALHOS: Atalho[] = [
  {
    para: "/clientes",
    rotulo: "Clientes",
    icone: "pessoas",
    cargos: ["atendente", "gerente"],
  },
  {
    para: "/cozinha",
    rotulo: "Cozinha",
    icone: "panela",
    cargos: ["cozinheiro", "atendente", "gerente"],
  },
  {
    para: "/entregas",
    rotulo: "Entregas",
    icone: "moto",
    cargos: ["entregador", "atendente", "gerente"],
  },
  {
    para: "/inicio",
    rotulo: "Início do atendente",
    icone: "inicio",
    cargos: ["atendente", "gerente"],
  },
  {
    para: "/gerencia/pedidos",
    rotulo: "Gerência",
    icone: "grafico",
    cargos: ["gerente"],
  },
];

/**
 * "Mais" do atendente e "Perfil" do entregador: quem sou, atalhos para as
 * outras áreas que o cargo permite, tema, senha e sair.
 */
export function PerfilPage({ titulo = "Perfil" }: { titulo?: string }) {
  const { usuario, sair } = useAuth();
  const [trocando, setTrocando] = useState(false);
  const cargos = usuario?.cargos ?? [];
  const atalhos = ATALHOS.filter((a) =>
    a.cargos.some((c) => cargos.includes(c)),
  );

  return (
    <>
      <header className={estilos.cabecalho}>
        <h1 className="ui-titulo-pagina">{titulo}</h1>
      </header>
      <main className={estilos.conteudo}>
        <section
          className="ui-cartao"
          style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
        >
          <span className="ui-avatar ui-avatar--grande" aria-hidden="true">
            {inicial(usuario?.nome)}
          </span>
          <div className="ui-coluna" style={{ gap: 0 }}>
            <span style={{ font: "600 22px/28px var(--font-display)" }}>
              {usuario?.nome}
            </span>
            <span className="ui-texto-sm ui-suave">
              {cargos.length
                ? cargos.join(" · ")
                : "Sem cargo vigente hoje — fale com o gerente."}
            </span>
          </div>
        </section>

        {atalhos.length > 0 && (
          <nav
            aria-label="Outras áreas"
            className="ui-cartao"
            style={{ gap: 4, padding: 8 }}
          >
            {atalhos.map((a) => (
              <Link
                key={a.para}
                to={a.para}
                className="ui-linha"
                style={{
                  minHeight: 48,
                  padding: "0 10px",
                  gap: 12,
                  color: "var(--ink)",
                  textDecoration: "none",
                  font: "700 15px/20px var(--font-sans)",
                }}
              >
                <Icone nome={a.icone} />
                <span style={{ flex: 1 }}>{a.rotulo}</span>
                <Icone nome="avancar" tamanho={18} />
              </Link>
            ))}
          </nav>
        )}

        <section aria-labelledby="h-tema" className="ui-cartao">
          <h2 id="h-tema" className="ui-titulo-cartao">
            Tema
          </h2>
          <PreferenciaTema />
        </section>

        <section className="ui-cartao" style={{ gap: 8 }}>
          <button
            type="button"
            className="sc-btn sc-btn--ghost sc-btn--block"
            style={{ justifyContent: "flex-start" }}
            onClick={() => setTrocando(true)}
          >
            <Icone nome="chave" />
            Trocar minha senha
          </button>
          <Link
            to="/privacidade"
            className="sc-btn sc-btn--ghost sc-btn--block"
            style={{ justifyContent: "flex-start" }}
          >
            <Icone nome="olho" />
            Aviso de privacidade (LGPD)
          </Link>
          <button
            type="button"
            className="sc-btn sc-btn--ghost sc-btn--block"
            style={{
              justifyContent: "flex-start",
              color: "var(--danger-text)",
            }}
            onClick={sair}
          >
            <Icone nome="sair" />
            Sair do sistema
          </button>
        </section>
      </main>
      <Folha
        aberta={trocando}
        aoFechar={() => setTrocando(false)}
        titulo="Trocar senha"
        largura={480}
      >
        <TrocarSenha aoConcluir={() => setTrocando(false)} />
      </Folha>
    </>
  );
}
