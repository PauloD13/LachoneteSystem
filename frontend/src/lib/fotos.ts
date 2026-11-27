/** URL da foto do produto; a versão na URL deixa o navegador guardar em cache. */
export function urlDaFoto(produtoId: number, versao: number): string {
  return `/api/produtos/${produtoId}/foto?v=${versao}`;
}

/** Maior lado da foto depois de reduzida, em pixels. */
export const LADO_MAXIMO = 800;
/** Limite da API para a foto. */
export const TAMANHO_MAXIMO = 512 * 1024;

/** Medidas que cabem em `lado` x `lado` mantendo a proporção (nunca amplia). */
export function medidasReduzidas(
  largura: number,
  altura: number,
  lado = LADO_MAXIMO,
): { largura: number; altura: number } {
  const escala = Math.min(1, lado / Math.max(largura, altura));
  return {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
  };
}

/**
 * Reduz a foto no próprio navegador (foto de celular tem vários MB) e
 * converte para JPEG, baixando a qualidade até caber no limite da API.
 */
export async function reduzirFoto(arquivo: File): Promise<Blob> {
  const imagem = await createImageBitmap(arquivo);
  const { largura, altura } = medidasReduzidas(imagem.width, imagem.height);
  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const contexto = tela.getContext("2d");
  if (!contexto) throw new Error("Este navegador não consegue reduzir a foto.");
  // Fundo branco: PNG transparente viraria preto no JPEG.
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, largura, altura);
  contexto.drawImage(imagem, 0, 0, largura, altura);
  imagem.close();

  for (const qualidade of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((ok) =>
      tela.toBlob(ok, "image/jpeg", qualidade),
    );
    if (blob && blob.size <= TAMANHO_MAXIMO) return blob;
  }
  throw new Error("Não foi possível deixar a foto com menos de 512 KB.");
}
