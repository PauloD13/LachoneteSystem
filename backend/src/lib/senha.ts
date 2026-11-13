import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Senha nunca é guardada: guarda-se o resultado de uma função de mão única
// (hash). No login, aplica-se a mesma função à senha digitada e comparam-se
// os resultados.
//
// Por que scrypt e não SHA-256? SHA-256 foi feito para ser RÁPIDO — ótimo
// para conferir arquivos, péssimo para senhas: quem roubar o banco testa
// bilhões de palpites por segundo. O scrypt é propositalmente lento e gasta
// memória, o que torna cada palpite caro. Ele já vem no Node (node:crypto),
// sem dependência nativa para compilar no container.
//
// Formato gravado em funcionario.senha_hash:
//   scrypt$N$r$p$<sal em base64>$<hash em base64>
// Os parâmetros vão junto para que possam ser aumentados no futuro sem
// invalidar as senhas já cadastradas.

const N = 16384; // custo de CPU/memória (2^14)
const R = 8;
const P = 1;
const TAMANHO_DA_CHAVE = 64;
const TAMANHO_DO_SAL = 16;

function derivar(
  senha: string,
  sal: Buffer,
  n: number,
  r: number,
  p: number,
  tamanho: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha, sal, tamanho, { N: n, r, p }, (erro, chave) =>
      erro ? reject(erro) : resolve(chave),
    );
  });
}

export async function gerarHashDaSenha(senha: string): Promise<string> {
  // Sal: valor aleatório por senha. Duas pessoas com a mesma senha ficam com
  // hashes diferentes, e tabelas de hashes pré-calculados deixam de servir.
  const sal = randomBytes(TAMANHO_DO_SAL);
  const chave = await derivar(senha, sal, N, R, P, TAMANHO_DA_CHAVE);
  return ["scrypt", N, R, P, sal.toString("base64"), chave.toString("base64")].join("$");
}

export async function conferirSenha(senha: string, gravado: string): Promise<boolean> {
  const [algoritmo, n, r, p, salB64, chaveB64] = gravado.split("$");
  if (algoritmo !== "scrypt" || !salB64 || !chaveB64) return false;

  const esperada = Buffer.from(chaveB64, "base64");
  const calculada = await derivar(
    senha,
    Buffer.from(salB64, "base64"),
    Number(n),
    Number(r),
    Number(p),
    esperada.length,
  );
  // Comparação em tempo constante: não revela, pelo tempo de resposta,
  // quantos bytes iniciais estavam certos.
  return timingSafeEqual(calculada, esperada);
}

// "Versão" da credencial: um resumo curto do hash da senha, embutido no
// token. Se a senha for trocada (ou o acesso removido), o resumo muda e os
// tokens emitidos antes deixam de ser aceitos.
export function versaoDaCredencial(senhaHash: string): string {
  return createHash("sha256").update(senhaHash).digest("base64url").slice(0, 16);
}
