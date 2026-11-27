/** Oferece um JSON para o usuário salvar, sem passar por outra página. */
export function baixarJson(nomeDoArquivo: string, dados: unknown): void {
  const blob = new Blob([JSON.stringify(dados, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeDoArquivo;
  document.body.append(link);
  link.click();
  link.remove();
  // O navegador já começou o download; a URL temporária pode ser liberada.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
