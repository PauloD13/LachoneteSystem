import { Router } from "express";

const router = Router();

router.get('/health', (req, res) => {
  console.log("API rodando");
  res.status(200).json({ status: "OK" }); // É importante enviar uma resposta para o cliente não ficar travado
});