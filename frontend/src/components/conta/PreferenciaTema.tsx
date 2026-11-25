import { useState } from "react";
import { Segmentado } from "../ui/Segmentado";
import {
  definirPreferencia,
  lerPreferencia,
  type PreferenciaDeTema,
} from "../../lib/tema";

/** Tema claro/escuro/igual ao aparelho (salvo neste navegador). */
export function PreferenciaTema() {
  const [tema, setTema] = useState<PreferenciaDeTema>(lerPreferencia);
  return (
    <Segmentado<PreferenciaDeTema>
      rotulo="Tema"
      valor={tema}
      aoMudar={(valor) => {
        setTema(valor);
        definirPreferencia(valor);
      }}
      opcoes={[
        { valor: "claro", rotulo: "Claro" },
        { valor: "escuro", rotulo: "Escuro" },
        { valor: "sistema", rotulo: "Do aparelho" },
      ]}
    />
  );
}
