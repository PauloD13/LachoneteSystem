/** Um evento de um fluxo Server-Sent Events. */
export interface EventoSse {
  evento: string;
  dados: string;
}

/**
 * Separa os eventos completos de um trecho do fluxo SSE. O que ainda não
 * terminou (sem a linha em branco final) volta em `resto`, para juntar com o
 * próximo pedaço que chegar. Comentários (linhas com ":") são ignorados.
 */
export function separarEventos(texto: string): {
  eventos: EventoSse[];
  resto: string;
} {
  const blocos = texto.replace(/\r\n?/g, "\n").split("\n\n");
  const resto = blocos.pop() ?? "";
  const eventos: EventoSse[] = [];
  for (const bloco of blocos) {
    let evento = "message";
    const dados: string[] = [];
    for (const linha of bloco.split("\n")) {
      if (linha.startsWith("event:")) evento = linha.slice(6).trim();
      else if (linha.startsWith("data:"))
        dados.push(linha.slice(5).trimStart());
    }
    if (dados.length > 0) eventos.push({ evento, dados: dados.join("\n") });
  }
  return { eventos, resto };
}
