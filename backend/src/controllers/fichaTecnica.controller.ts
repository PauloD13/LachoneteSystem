import type { Request, Response } from "express";
import * as fichaTecnicaService from "../services/fichaTecnica.service.js";
import {
  produtoIdParamSchema,
  fichaTecnicaParamSchema,
  definirIngredienteSchema,
} from "../validators/fichaTecnica.validator.js";

export async function listar(req: Request, res: Response): Promise<void> {
  const { produtoId } = produtoIdParamSchema.parse(req.params);
  res.status(200).json(await fichaTecnicaService.listar(produtoId));
}

export async function definir(req: Request, res: Response): Promise<void> {
  const { produtoId, ingredienteId } = fichaTecnicaParamSchema.parse(
    req.params,
  );
  const { quantidadeUtilizada } = definirIngredienteSchema.parse(req.body);
  res
    .status(200)
    .json(
      await fichaTecnicaService.definir(
        produtoId,
        ingredienteId,
        quantidadeUtilizada,
      ),
    );
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { produtoId, ingredienteId } = fichaTecnicaParamSchema.parse(
    req.params,
  );
  await fichaTecnicaService.remover(produtoId, ingredienteId);
  res.status(204).send();
}
