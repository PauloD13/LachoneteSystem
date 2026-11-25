import { useState } from "react";
import { Abas } from "../../components/ui/Abas";
import { Botao } from "../../components/ui/Botao";
import { Icone } from "../../components/ui/Icone";
import { ProdutosAba } from "./cardapio/ProdutosAba";
import { CombosAba } from "./cardapio/CombosAba";
import { CategoriasAba } from "./cardapio/CategoriasAba";
import { AdicionaisAba } from "./cardapio/AdicionaisAba";
import { PromocoesAba } from "./cardapio/PromocoesAba";

type Aba = "produtos" | "combos" | "categorias" | "adicionais" | "promocoes";

const NOVO: Partial<Record<Aba, string>> = {
  produtos: "Novo produto",
  combos: "Novo combo",
  adicionais: "Novo adicional",
};

/** Tela 12 — Cardápio (gerente). */
export function CardapioPage() {
  const [aba, setAba] = useState<Aba>("produtos");
  const [novo, setNovo] = useState(false);

  return (
    <>
      <header className="ui-cabecalho-gerencia">
        <h1>Cardápio</h1>
        {NOVO[aba] && (
          <Botao variante="primario" onClick={() => setNovo(true)}>
            <Icone nome="mais" />
            {NOVO[aba]}
          </Botao>
        )}
      </header>
      <Abas<Aba>
        rotulo="Seções do cardápio"
        valor={aba}
        aoMudar={(a) => {
          setAba(a);
          setNovo(false);
        }}
        abas={[
          { valor: "produtos", rotulo: "Produtos" },
          { valor: "combos", rotulo: "Combos" },
          { valor: "categorias", rotulo: "Categorias" },
          { valor: "adicionais", rotulo: "Adicionais" },
          { valor: "promocoes", rotulo: "Promoções e cupons" },
        ]}
      />
      <div role="tabpanel" className="sc-screen-enter" key={aba}>
        {aba === "produtos" && (
          <ProdutosAba novo={novo} aoAbrirNovo={setNovo} />
        )}
        {aba === "combos" && <CombosAba novo={novo} aoAbrirNovo={setNovo} />}
        {aba === "categorias" && <CategoriasAba />}
        {aba === "adicionais" && (
          <AdicionaisAba novo={novo} aoAbrirNovo={setNovo} />
        )}
        {aba === "promocoes" && <PromocoesAba />}
      </div>
    </>
  );
}
