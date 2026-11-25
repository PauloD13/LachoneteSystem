import { useCallback, useState } from "react";
import { useAvisos } from "./useAvisos";
import { errosDosCampos } from "../lib/formularios";

/**
 * Executa uma ação que fala com a API (salvar, excluir...): controla o
 * "ocupado", mostra o aviso de sucesso ou de erro e guarda os erros por
 * campo das respostas 400. Devolve `true` se deu certo.
 */
export function useAcao() {
  const avisos = useAvisos();
  const [ocupado, setOcupado] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  const executar = useCallback(
    async (
      acao: () => Promise<unknown>,
      sucesso?: string,
    ): Promise<boolean> => {
      setOcupado(true);
      setErros({});
      try {
        await acao();
        if (sucesso) avisos.sucesso(sucesso);
        return true;
      } catch (erro) {
        setErros(errosDosCampos(erro));
        avisos.erro(erro);
        return false;
      } finally {
        setOcupado(false);
      }
    },
    [avisos],
  );

  return { executar, ocupado, erros, setErros };
}
