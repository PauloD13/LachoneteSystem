import type { Request, Response } from "express";
import * as produtoService from "../services/produto.service.js";
import { AppError } from "../lib/appError.js";
import { tipoDaImagem } from "../lib/imagem.js";
import { idParamSchema } from "../validators/comum.js";
import {
  criarProdutoSchema,
  atualizarProdutoSchema,
  listarProdutosQuerySchema,
} from "../validators/produto.validator.js";

export async function criar(req: Request, res: Response): Promise<void> {
  const dados = criarProdutoSchema.parse(req.body);
  res.status(201).json(await produtoService.criar(dados));
}

export async function listar(req: Request, res: Response): Promise<void> {
  const filtros = listarProdutosQuerySchema.parse(req.query);
  res.status(200).json(await produtoService.listar(filtros));
}

export async function buscarPorId(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await produtoService.buscarPorId(id));
}

export async function atualizar(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados = atualizarProdutoSchema.parse(req.body);
  res.status(200).json(await produtoService.atualizar(id, dados));
}

export async function remover(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  await produtoService.remover(id);
  res.status(204).send();
}

// PUT /produtos/:id/foto — o corpo é a própria imagem (JPEG, PNG ou WebP,
// até 512 KB), não JSON. A tela reduz a foto antes de enviar.
export async function enviarFoto(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const dados: unknown = req.body;
  const tipo =
    Buffer.isBuffer(dados) && dados.length > 0 ? tipoDaImagem(dados) : null;
  if (!Buffer.isBuffer(dados) || !tipo) {
    throw new AppError(400, "Envie uma imagem JPEG, PNG ou WebP.");
  }
  res
    .status(200)
    .json(await produtoService.definirFoto(id, tipo, new Uint8Array(dados)));
}

export async function removerFoto(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  res.status(200).json(await produtoService.removerFoto(id));
}

// GET /produtos/:id/foto — público, porque <img> não envia o token. Com
// ?v= (a fotoVersao), a URL muda a cada foto nova: pode ficar em cache.
export async function foto(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const { tipo, dados } = await produtoService.buscarFoto(id);
  res.setHeader(
    "Cache-Control",
    req.query.v ? "public, max-age=31536000, immutable" : "no-cache",
  );
  res.type(tipo).send(Buffer.from(dados));
}
