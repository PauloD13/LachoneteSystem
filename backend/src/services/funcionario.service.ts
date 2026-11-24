import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { vinculoVigente } from "../lib/cargos.js";
import { paginar, recorte } from "../lib/paginacao.js";
import { removerOuExplicar } from "../lib/remocao.js";
import { gerarHashDaSenha } from "../lib/senha.js";
import type {
  CriarFuncionarioDTO,
  AtualizarFuncionarioDTO,
  ListarFuncionariosQuery,
} from "../validators/funcionario.validator.js";

// Toda consulta traz junto os cargos que o funcionário exerce hoje.
// (senha_hash nunca vem: o client do Prisma o omite por padrão — lib/prisma.ts)
function comCargosDeHoje() {
  return {
    funcionarioCargos: {
      where: vinculoVigente(),
      include: { cargo: true },
      orderBy: { id: "asc" },
    },
  } satisfies Prisma.FuncionarioInclude;
}

type FuncionarioComCargos = Prisma.FuncionarioGetPayload<{
  include: ReturnType<typeof comCargosDeHoje>;
  omit: { senhaHash: true };
}>;

function formatar(funcionario: FuncionarioComCargos) {
  const { funcionarioCargos, ...dados } = funcionario;
  return {
    ...dados,
    cargos: [...new Set(funcionarioCargos.map((v) => v.cargo.nome))],
  };
}

export async function criar(dados: CriarFuncionarioDTO) {
  const { senha, ...campos } = dados;
  const funcionario = await prisma.funcionario.create({
    data: {
      ...campos,
      // A senha em texto puro morre aqui: só o hash vai para o banco.
      senhaHash: senha ? await gerarHashDaSenha(senha) : null,
    },
    include: comCargosDeHoje(),
  });
  return formatar(funcionario);
}

export async function listar({
  ativo,
  cargo,
  ...pagina
}: ListarFuncionariosQuery) {
  const where: Prisma.FuncionarioWhereInput = {
    ...(ativo === undefined ? {} : { ativo }),
    ...(cargo === undefined
      ? {}
      : {
          funcionarioCargos: {
            some: { ...vinculoVigente(), cargo: { nome: cargo } },
          },
        }),
  };

  const [funcionarios, total] = await prisma.$transaction([
    prisma.funcionario.findMany({
      where,
      include: comCargosDeHoje(),
      orderBy: [{ nome: "asc" }, { id: "asc" }],
      ...recorte(pagina),
    }),
    prisma.funcionario.count({ where }),
  ]);
  return paginar(funcionarios.map(formatar), total, pagina);
}

export async function buscarPorId(id: number) {
  const funcionario = await prisma.funcionario.findUniqueOrThrow({
    where: { id },
    include: comCargosDeHoje(),
  });
  return formatar(funcionario);
}

// `autorId` é quem está fazendo a alteração (o gerente logado). Um gerente
// não pode tirar o PRÓPRIO acesso: como só gerentes alteram funcionários,
// essa regra simples garante que o sistema nunca fica sem nenhum gerente
// capaz de entrar.
export async function atualizar(
  id: number,
  dados: AtualizarFuncionarioDTO,
  autorId: number,
) {
  const { senha, login, ...campos } = dados;

  const funcionario = await prisma.$transaction(async (tx) => {
    const atual = await tx.funcionario.findUniqueOrThrow({
      where: { id },
      omit: { senhaHash: false },
    });

    if (id === autorId && (campos.ativo === false || login === null)) {
      throw new AppError(
        409,
        "Você não pode desativar nem remover o seu próprio acesso. Peça a outro gerente.",
      );
    }

    const credenciais: Prisma.FuncionarioUpdateInput = {};
    if (login === null) {
      if (senha !== undefined) {
        throw new AppError(
          400,
          "Não faz sentido definir senha ao remover o login (login: null).",
        );
      }
      credenciais.login = null;
      credenciais.senhaHash = null;
    } else {
      const loginFinal = login ?? atual.login;
      if (senha !== undefined && loginFinal === null) {
        throw new AppError(400, "Informe também o login para dar acesso ao sistema.");
      }
      if (login !== undefined && atual.senhaHash === null && senha === undefined) {
        throw new AppError(400, "Informe também a senha para dar acesso ao sistema.");
      }
      if (login !== undefined) credenciais.login = login;
      if (senha !== undefined) credenciais.senhaHash = await gerarHashDaSenha(senha);
    }

    return tx.funcionario.update({
      where: { id },
      data: { ...campos, ...credenciais },
      include: comCargosDeHoje(),
    });
  });

  return formatar(funcionario);
}

export async function remover(id: number, autorId: number) {
  if (id === autorId) {
    throw new AppError(409, "Você não pode remover o seu próprio cadastro.");
  }
  await removerOuExplicar(
    () => prisma.funcionario.delete({ where: { id } }),
    "Funcionário com histórico (cargos, pedidos atendidos ou entregas) não pode ser removido: desative-o (ativo = false).",
  );
}
