export type TipoDeImagem = "image/jpeg" | "image/png" | "image/webp";

/**
 * Tipo da imagem pelos primeiros bytes do arquivo, e não pelo cabeçalho
 * Content-Type, que o cliente pode mandar errado: assim só imagem de verdade
 * é gravada e servida como imagem.
 */
export function tipoDaImagem(dados: Uint8Array): TipoDeImagem | null {
  const comeca = (...bytes: number[]) => bytes.every((b, i) => dados[i] === b);
  if (comeca(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (comeca(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    return "image/png";
  const texto = (inicio: number, fim: number) =>
    String.fromCharCode(...dados.subarray(inicio, fim));
  if (texto(0, 4) === "RIFF" && texto(8, 12) === "WEBP") return "image/webp";
  return null;
}
