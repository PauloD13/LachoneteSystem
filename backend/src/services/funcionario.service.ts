import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import {
    CriarFuncionarioDTO, AtualizarFuncionarioDTO } from "../validators/funcionario.validator.js";
}

export async function criar(dados: CriarFuncionarioDTO) {
    const novoFuncionario = await prisma.funcionario.create({
        data: dados,
    });
    return novoFuncionario;
}

export async function listar() {
    const funcionarios = await prisma.funcionario.findMany();
    return funcionarios;
}

export async function buscarPorId(id: string) {
    const funcionario = await prisma.funcionario.findUnique({
        where: { id },
    });
    if (!funcionario) {
        throw new Prisma.PrismaClientKnownRequestError(
            "Funcionário não encontrado",
            "P2025",
            "funcionario.service.ts",
            404
        );
    }
    return funcionario;
}

export async function atualizar(id: string, dados: AtualizarFuncionarioDTO) {
    const funcionarioAtualizado = await prisma.funcionario.update({
        where: { id },
        data: dados,
    });
    return funcionarioAtualizado;
}

export async function remover(id: string) {
    await prisma.funcionario.delete({
        where: { id },
    });
}
