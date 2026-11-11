import type { Request, Response } from "express";
import * as relatorioService from "../services/relatorio.service.js";
import {
  periodoQuerySchema,
  maisVendidosQuerySchema,
} from "../validators/relatorio.validator.js";

export async function maisVendidos(req: Request, res: Response): Promise<void> {
  const { dataInicio, dataFim, limite } = maisVendidosQuerySchema.parse(
    req.query,
  );
  res
    .status(200)
    .json(await relatorioService.maisVendidos(dataInicio, dataFim, limite));
}

export async function consumoIngredientes(
  req: Request,
  res: Response,
): Promise<void> {
  const { dataInicio, dataFim } = periodoQuerySchema.parse(req.query);
  res
    .status(200)
    .json(await relatorioService.consumoIngredientes(dataInicio, dataFim));
}

export async function vendasPorAtendente(
  req: Request,
  res: Response,
): Promise<void> {
  const { dataInicio, dataFim } = periodoQuerySchema.parse(req.query);
  res
    .status(200)
    .json(await relatorioService.vendasPorAtendente(dataInicio, dataFim));
}
