import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import {
  api,
  criarCategoria,
  criarFuncionario,
  criarProduto,
  gerente,
  ok,
  type Json,
} from "./apoio.ts";

const API_URL = process.env.API_URL ?? "http://localhost:3000/api";

// PNG de 1x1 pixel.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function enviar(
  token: string,
  id: number,
  corpo: Uint8Array,
  tipo = "image/png",
) {
  return fetch(`${API_URL}/produtos/${id}/foto`, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "content-type": tipo },
    body: corpo,
  });
}

let admin: string;
let produto: Json;

before(async () => {
  admin = await gerente();
  produto = await criarProduto(await criarCategoria(), 10);
});

describe("foto do produto", () => {
  it("o gerente envia, qualquer um vê (sem login) e a listagem traz a versão", async () => {
    assert.equal(produto.fotoVersao, null);

    const resposta = await enviar(admin, produto.id, PNG);
    assert.equal(resposta.status, 200);
    const comFoto = await resposta.json();
    assert.equal(typeof comFoto.fotoVersao, "number");

    const imagem = await fetch(
      `${API_URL}/produtos/${produto.id}/foto?v=${comFoto.fotoVersao}`,
    );
    assert.equal(imagem.status, 200);
    assert.equal(imagem.headers.get("content-type"), "image/png");
    assert.match(imagem.headers.get("cache-control") ?? "", /immutable/);
    assert.deepEqual(Buffer.from(await imagem.arrayBuffer()), PNG);

    const lista = await ok(200, "GET", `/produtos?busca=${produto.nome}`, {
      token: admin,
    });
    assert.equal(lista.dados[0].fotoVersao, comFoto.fotoVersao);
  });

  it("só o gerente troca a foto, e só aceita imagem de verdade", async () => {
    const atendente = await criarFuncionario("atendente");
    assert.equal((await enviar(atendente.token, produto.id, PNG)).status, 403);

    // Diz que é PNG, mas é texto.
    const falso = await enviar(admin, produto.id, Buffer.from("não é imagem"));
    assert.equal(falso.status, 400);

    const enorme = Buffer.alloc(600 * 1024, 1);
    PNG.copy(enorme);
    assert.equal((await enviar(admin, produto.id, enorme)).status, 413);

    assert.equal(
      (await enviar(admin, 2_000_000_000, PNG)).status,
      404,
      "produto que não existe",
    );
  });

  it("remover a foto volta ao ícone da categoria", async () => {
    await enviar(admin, produto.id, PNG);
    const semFoto = await ok(200, "DELETE", `/produtos/${produto.id}/foto`, {
      token: admin,
    });
    assert.equal(semFoto.fotoVersao, null);
    assert.equal(
      (await api("GET", `/produtos/${produto.id}/foto`)).status,
      404,
    );
  });
});
