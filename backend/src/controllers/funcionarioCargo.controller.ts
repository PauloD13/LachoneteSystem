import type { Request, Response } from "express";
import * as funcionarioCargoService from "../services/funcionarioCargo.service.js";
import {
  funcionarioIdParamSchema,
  vinculoParamSchema,
  abrirVinculoSchema,
  encerrarVinculoSchema,
} from "../validators/funcionarioCargo.validator.js";

export async function abrir(req: Request, res: Response): Promise<void> {
  const { funcionarioId } = funcionarioIdParamSchema.parse(req.params);
  const { cargoId, dataInicio } = abrirVinculoSchema.parse(req.body);
  const vinculo = await funcionarioCargoService.abrir(
    funcionarioId,
    cargoId,
    dataInicio,
  );
  res.status(201).json(vinculo);
}

export async function listar(req: Request, res: Response): Promise<void> {
  const { funcionarioId } = funcionarioIdParamSchema.parse(req.params);
  const vinculos =
    await funcionarioCargoService.listarPorFuncionario(funcionarioId);
  res.status(200).json(vinculos);
}

export async function encerrar(req: Request, res: Response): Promise<void> {
  const { funcionarioId, vinculoId } = vinculoParamSchema.parse(req.params);
  const { dataFim } = encerrarVinculoSchema.parse(req.body);
  const vinculo = await funcionarioCargoService.encerrar(
    funcionarioId,
    vinculoId,
    dataFim,
  );
  res.status(200).json(vinculo);
}
