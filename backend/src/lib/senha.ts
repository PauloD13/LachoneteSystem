import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt, e não SHA-256: é lento e gasta memória de propósito, então quem
// roubar o banco não testa bilhões de palpites por segundo. Já vem no Node,
// sem dependência nativa para compilar no container.
//
// Formato em funcionario.senha_hash: scrypt$N$r$p$<sal>$<hash> (base64). Os
// parâmetros vão junto para poderem subir sem invalidar senhas antigas.

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
  // Sal por senha: senhas iguais geram hashes diferentes.
  const sal = randomBytes(TAMANHO_DO_SAL);
  const chave = await derivar(senha, sal, N, R, P, TAMANHO_DA_CHAVE);
  return [
    "scrypt",
    N,
    R,
    P,
    sal.toString("base64"),
    chave.toString("base64"),
  ].join("$");
}

export async function conferirSenha(
  senha: string,
  gravado: string,
): Promise<boolean> {
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
  // Tempo constante: o tempo de resposta não revela quantos bytes acertou.
  return timingSafeEqual(calculada, esperada);
}

// Resumo do hash embutido no token: trocar a senha (ou remover o acesso)
// invalida os tokens já emitidos.
export function versaoDaCredencial(senhaHash: string): string {
  return createHash("sha256")
    .update(senhaHash)
    .digest("base64url")
    .slice(0, 16);
}
