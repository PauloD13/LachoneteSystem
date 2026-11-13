import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { environment } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { CARGO, vinculoVigente } from "../lib/cargos.js";
import { hojeComoData } from "../lib/datas.js";
import { logger } from "../lib/logger.js";
import {
  conferirSenha,
  gerarHashDaSenha,
  versaoDaCredencial,
} from "../lib/senha.js";
import type { UsuarioAutenticado } from "../middlewares/autenticacao.js";
import type { LoginDTO, TrocarSenhaDTO } from "../validators/auth.validator.js";

// Como funciona a sessão:
//   1. POST /auth/login confere login e senha e devolve um TOKEN (JWT): um
//      texto assinado com JWT_SECRET que diz "sou o funcionário N, válido
//      até tal hora". Só quem tem a chave consegue produzir a assinatura.
//   2. O frontend guarda o token e o envia em toda requisição, no cabeçalho
//      Authorization: Bearer <token>.
//   3. O middleware `autenticar` chama identificar() abaixo.
// O servidor não guarda sessão nenhuma: o token se prova sozinho.

const SESSAO_INVALIDA = "Sessão inválida ou expirada. Faça login novamente.";
const ALGORITMO = "HS256";

// Busca explícita do senha_hash (o client do Prisma o omite por padrão) e
// dos cargos que o funcionário exerce hoje.
function buscarComCredencial(onde: { id: number } | { login: string }) {
  return prisma.funcionario.findUnique({
    where: onde,
    omit: { senhaHash: false },
    include: {
      funcionarioCargos: {
        where: vinculoVigente(),
        include: { cargo: true },
      },
    },
  });
}

type FuncionarioComCredencial = NonNullable<
  Awaited<ReturnType<typeof buscarComCredencial>>
>;

function perfil(funcionario: FuncionarioComCredencial): UsuarioAutenticado {
  return {
    id: funcionario.id,
    nome: funcionario.nome,
    cargos: [...new Set(funcionario.funcionarioCargos.map((v) => v.cargo.nome))],
  };
}

// Hash de uma senha que ninguém conhece. Quando o login não existe,
// confere-se a senha contra ele mesmo assim: a resposta leva o mesmo tempo
// de um login existente, e o tempo deixa de revelar quais logins existem.
const hashDeMentira = gerarHashDaSenha(randomBytes(32).toString("hex"));

export async function login({ login, senha }: LoginDTO) {
  const funcionario = await buscarComCredencial({ login });
  const senhaConfere = await conferirSenha(
    senha,
    funcionario?.senhaHash ?? (await hashDeMentira),
  );

  // Uma única mensagem para todos os casos (login inexistente, senha errada,
  // funcionário desativado): não confirmar a quem tenta qual parte errou.
  if (!funcionario?.senhaHash || !funcionario.ativo || !senhaConfere) {
    throw new AppError(401, "Login ou senha inválidos.");
  }

  const segundos = environment.JWT_EXPIRA_EM_HORAS * 60 * 60;
  const token = jwt.sign(
    { ver: versaoDaCredencial(funcionario.senhaHash) },
    environment.JWT_SECRET,
    { subject: String(funcionario.id), expiresIn: segundos, algorithm: ALGORITMO },
  );

  return {
    token,
    tipo: "Bearer",
    expiraEm: new Date(Date.now() + segundos * 1000),
    funcionario: perfil(funcionario),
  };
}

export async function identificar(token: string): Promise<UsuarioAutenticado> {
  let conteudo: jwt.JwtPayload;
  try {
    // `algorithms` fixo: recusa tokens "assinados" com outro algoritmo
    // (inclusive o "none", truque clássico para forjar JWT).
    const verificado = jwt.verify(token, environment.JWT_SECRET, {
      algorithms: [ALGORITMO],
    });
    if (typeof verificado === "string") throw new Error("formato inesperado");
    conteudo = verificado;
  } catch {
    throw new AppError(401, SESSAO_INVALIDA);
  }

  const id = Number(conteudo.sub);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(401, SESSAO_INVALIDA);
  }

  const funcionario = await buscarComCredencial({ id });
  if (
    !funcionario?.senhaHash ||
    !funcionario.ativo ||
    conteudo.ver !== versaoDaCredencial(funcionario.senhaHash)
  ) {
    throw new AppError(401, SESSAO_INVALIDA);
  }

  return perfil(funcionario);
}

// Troca da PRÓPRIA senha. Como a versão da credencial muda, todos os tokens
// antigos (inclusive o desta requisição) deixam de valer: é preciso entrar
// de novo.
export async function trocarSenha(
  funcionarioId: number,
  { senhaAtual, novaSenha }: TrocarSenhaDTO,
) {
  const funcionario = await buscarComCredencial({ id: funcionarioId });
  if (
    !funcionario?.senhaHash ||
    !(await conferirSenha(senhaAtual, funcionario.senhaHash))
  ) {
    throw new AppError(401, "Senha atual incorreta.");
  }
  await prisma.funcionario.update({
    where: { id: funcionarioId },
    data: { senhaHash: await gerarHashDaSenha(novaSenha) },
  });
}

// Problema do "primeiro usuário": para cadastrar alguém com login é preciso
// estar logado como gerente — mas num banco novo não existe gerente.
// Solução: se ADMIN_LOGIN/ADMIN_SENHA estiverem definidos e ainda não houver
// NENHUM funcionário com login, cria-se o gerente inicial. Com qualquer login
// já cadastrado, esta função não faz nada (não redefine senha de ninguém).
export async function garantirAdministradorInicial(): Promise<void> {
  const comAcesso = await prisma.funcionario.count({
    where: { login: { not: null } },
  });
  if (comAcesso > 0) return;

  const { ADMIN_LOGIN, ADMIN_SENHA } = environment;
  if (!ADMIN_LOGIN || !ADMIN_SENHA) {
    logger.warn(
      "nenhum funcionário tem login e ADMIN_LOGIN/ADMIN_SENHA não foram definidos: ninguém consegue entrar no sistema",
    );
    return;
  }

  const senhaHash = await gerarHashDaSenha(ADMIN_SENHA);
  await prisma.$transaction(async (tx) => {
    const gerente = await tx.cargo.upsert({
      where: { nome: CARGO.GERENTE },
      update: {},
      create: { nome: CARGO.GERENTE },
    });
    await tx.funcionario.create({
      data: {
        nome: "Administrador",
        login: ADMIN_LOGIN,
        senhaHash,
        funcionarioCargos: {
          create: { cargoId: gerente.id, dataInicio: hojeComoData() },
        },
      },
    });
  });
  logger.info("gerente inicial criado", { login: ADMIN_LOGIN });
}
