import { z } from "zod";
import {
  dia,
  dinheiro,
  idNaUrl,
  idNoCorpo,
  paginacaoQuerySchema,
} from "./comum.js";
import { codigoCupom } from "./cupom.validator.js";

export const STATUS_PEDIDO = [
  "RECEBIDO",
  "EM_PREPARO",
  "PRONTO",
  "SAIU_PARA_ENTREGA",
  "ENTREGUE_RETIRADO",
  "CANCELADO",
] as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[number];

const statusPedido = z.enum(STATUS_PEDIDO, {
  error: `status deve ser um de: ${STATUS_PEDIDO.join(", ")}.`,
});

const itemSchema = z.object({
  // Produto ou combo — sempre pelo id do item_vendavel (supertipo).
  itemVendavelId: idNoCorpo,
  quantidade: z
    .number({ error: "Informe a quantidade." })
    .int()
    .positive("A quantidade deve ser maior que zero.")
    .max(1000),
  variacaoId: idNoCorpo.nullish(),
  observacao: z.string().trim().max(200).nullish(),
  adicionalIds: z
    .array(idNoCorpo)
    .max(20)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Há adicional repetido no item.",
    )
    .default([]),
});

const enderecoSchema = z.object({
  logradouro: z.string().trim().min(1).max(150),
  numero: z.string().trim().min(1).max(10),
  bairro: z.string().trim().min(1).max(100),
  cidade: z.string().trim().min(1).max(100),
  cep: z.string().trim().min(1).max(9),
});

const entregaSchema = z.object({
  // Opcional na criação; obrigatório para o pedido sair para entrega.
  entregadorId: idNoCorpo.nullish(),
  taxaEntrega: dinheiro,
  // Se omitido, usa o endereço padrão do cadastro do cliente.
  endereco: enderecoSchema.optional(),
});

export const pagamentoSchema = z.object({
  formaPagamentoId: idNoCorpo,
  valorPago: dinheiro.positive("O valor pago deve ser maior que zero."),
});

export const criarPedidoSchema = z
  .object({
    canal: z.enum(["BALCAO", "TELEFONE", "APP"], {
      error: "canal deve ser BALCAO, TELEFONE ou APP.",
    }),
    clienteId: idNoCorpo.nullish(),
    mesaId: idNoCorpo.nullish(),
    // Se omitido, o atendente é o funcionário logado.
    atendenteId: idNoCorpo.optional(),
    cupomCodigo: codigoCupom.nullish(),
    observacoes: z.string().trim().max(2000).nullish(),
    itens: z
      .array(itemSchema)
      .min(1, "O pedido precisa de ao menos um item.")
      .max(100),
    entrega: entregaSchema.nullish(),
    pagamentos: z.array(pagamentoSchema).max(10).default([]),
  })
  .superRefine((pedido, ctx) => {
    const semCliente = pedido.clienteId == null;

    // Regra 4.1: cadastro do cliente é obrigatório para app e delivery.
    if (pedido.canal === "APP" && semCliente) {
      ctx.addIssue({
        code: "custom",
        path: ["clienteId"],
        message: "Pedidos pelo aplicativo exigem cliente cadastrado.",
      });
    }
    if (pedido.entrega && semCliente) {
      ctx.addIssue({
        code: "custom",
        path: ["clienteId"],
        message: "Pedidos para entrega exigem cliente cadastrado.",
      });
    }
    // Regra 4.1: mesa só para consumo no local (nunca junto com delivery).
    if (pedido.entrega && pedido.mesaId != null) {
      ctx.addIssue({
        code: "custom",
        path: ["mesaId"],
        message: "Pedido para entrega não pode estar associado a uma mesa.",
      });
    }
    // Regra 4.3: cupom vale uma vez por cliente — sem cliente identificado
    // não há como aplicar a regra.
    if (pedido.cupomCodigo && semCliente) {
      ctx.addIssue({
        code: "custom",
        path: ["cupomCodigo"],
        message: "Cupom só pode ser usado por cliente cadastrado.",
      });
    }
  });

export const atualizarStatusSchema = z.object({ status: statusPedido });

// null retira o entregador (enquanto o pedido ainda não saiu).
export const definirEntregadorSchema = z.object({
  entregadorId: idNoCorpo.nullable(),
});

export const avaliarPedidoSchema = z.object({
  nota: z
    .number({ error: "Informe a nota." })
    .int()
    .min(1, "A nota vai de 1 a 5.")
    .max(5, "A nota vai de 1 a 5."),
  comentario: z.string().trim().max(2000).nullish(),
});

export const listarPedidosQuerySchema = paginacaoQuerySchema
  .extend({
    status: statusPedido.optional(),
    clienteId: idNaUrl.optional(),
    dataInicio: dia.optional(),
    dataFim: dia.optional(),
  })
  .refine(
    (q) => !q.dataInicio || !q.dataFim || q.dataFim >= q.dataInicio,
    { message: "dataFim não pode ser anterior a dataInicio.", path: ["dataFim"] },
  );

export type CriarPedidoDTO = z.infer<typeof criarPedidoSchema>;
export type PagamentoDTO = z.infer<typeof pagamentoSchema>;
export type AvaliarPedidoDTO = z.infer<typeof avaliarPedidoSchema>;
export type ListarPedidosQuery = z.infer<typeof listarPedidosQuerySchema>;
