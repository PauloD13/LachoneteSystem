import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AvisosContexto, type ValorDosAvisos } from "./avisos-contexto";
import { Icone } from "../components/ui/Icone";
import { mensagemDeErro } from "../services/api";

interface Aviso {
  id: number;
  texto: string;
  tipo: "sucesso" | "erro";
}

/**
 * Avisos passageiros (toasts) da aplicação. Qualquer tela chama
 * `useAvisos().sucesso("Pedido enviado")` sem se preocupar com posição,
 * tempo ou acessibilidade (role="status" / "alert").
 */
export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const proximo = useRef(1);

  const mostrar = useCallback((texto: string, tipo: Aviso["tipo"]) => {
    const id = proximo.current++;
    // No máximo 3 na tela; o mais novo embaixo.
    setAvisos((atuais) => [...atuais.slice(-2), { id, texto, tipo }]);
    setTimeout(
      () => setAvisos((atuais) => atuais.filter((a) => a.id !== id)),
      tipo === "erro" ? 6000 : 3000,
    );
  }, []);

  const valor = useMemo<ValorDosAvisos>(
    () => ({
      sucesso: (texto) => mostrar(texto, "sucesso"),
      erro: (erro) =>
        mostrar(typeof erro === "string" ? erro : mensagemDeErro(erro), "erro"),
    }),
    [mostrar],
  );

  return (
    <AvisosContexto.Provider value={valor}>
      {children}
      {createPortal(
        <div className="ui-avisos sc-root">
          {avisos.map((aviso) => (
            <div
              key={aviso.id}
              role={aviso.tipo === "erro" ? "alert" : "status"}
              className={
                aviso.tipo === "erro" ? "sc-toast sc-toast--erro" : "sc-toast"
              }
            >
              <Icone
                nome={aviso.tipo === "erro" ? "alerta" : "check"}
                traco={2.6}
              />
              {aviso.texto}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </AvisosContexto.Provider>
  );
}
