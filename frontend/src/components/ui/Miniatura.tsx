import { urlDaFoto } from "../../lib/fotos";
import { Icone, type NomeDoIcone } from "./Icone";

interface Props {
  /** Produto com foto: mostra a foto; sem foto (ou combo), o ícone. */
  produtoId?: number;
  fotoVersao?: number | null;
  icone: NomeDoIcone;
  tamanho?: number;
}

/** Quadrado do produto: a foto, se houver; senão, o ícone da categoria. */
export function Miniatura({
  produtoId,
  fotoVersao,
  icone,
  tamanho = 64,
}: Props) {
  const estilo = { width: tamanho, height: tamanho };
  if (produtoId !== undefined && fotoVersao) {
    return (
      <img
        className="ui-miniatura ui-miniatura--foto"
        src={urlDaFoto(produtoId, fotoVersao)}
        alt=""
        loading="lazy"
        style={estilo}
      />
    );
  }
  return (
    <span className="ui-miniatura" aria-hidden="true" style={estilo}>
      <Icone nome={icone} tamanho={Math.round(tamanho * 0.47)} traco={1.8} />
    </span>
  );
}
