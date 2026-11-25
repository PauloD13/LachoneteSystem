import { useContext } from "react";
import {
  AvisosContexto,
  type ValorDosAvisos,
} from "../contexts/avisos-contexto";

export function useAvisos(): ValorDosAvisos {
  const valor = useContext(AvisosContexto);
  if (!valor)
    throw new Error("useAvisos precisa estar dentro de <AvisosProvider>.");
  return valor;
}
