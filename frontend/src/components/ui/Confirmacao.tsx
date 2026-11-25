import { useState, type ReactNode } from "react";
import { Folha } from "./Folha";
import { Botao } from "./Botao";

interface Props {
  aberta: boolean;
  titulo: string;
  children?: ReactNode;
  /** Ex.: "Cancelar pedido" — verbo, como todo botão. */
  confirmar: string;
  /** Ex.: "Cancelando…" */
  confirmando?: string;
  perigo?: boolean;
  aoConfirmar(): Promise<unknown> | void;
  aoFechar(): void;
}

/** Pergunta antes de uma ação difícil de desfazer (cancelar, excluir). */
export function Confirmacao({
  aberta,
  titulo,
  children,
  confirmar,
  confirmando,
  perigo,
  aoConfirmar,
  aoFechar,
}: Props) {
  const [ocupado, setOcupado] = useState(false);
  async function executar() {
    setOcupado(true);
    try {
      await aoConfirmar();
    } finally {
      setOcupado(false);
    }
  }
  return (
    <Folha
      aberta={aberta}
      aoFechar={ocupado ? () => {} : aoFechar}
      titulo={titulo}
      largura={440}
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar} disabled={ocupado}>
            Voltar
          </Botao>
          <Botao
            variante={perigo ? "perigo" : "primario"}
            onClick={executar}
            carregando={ocupado}
            textoCarregando={confirmando}
            style={{ flex: 1 }}
          >
            {confirmar}
          </Botao>
        </>
      }
    >
      {children && <div className="ui-texto-sm ui-suave">{children}</div>}
    </Folha>
  );
}
