import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { hojeComoData, inicioDoDia, somarDias } from "../lib/datas.js";
import { calcularDesconto, estaVigente } from "../lib/desconto.js";
import type {
  AvaliarPedidoDTO,
  CriarPedidoDTO,
  ListarPedidosQuery,
  PagamentoDTO,
  StatusPedido,
} from "../validators/pedido.validator.js";

type Tx = Prisma.TransactionClient;
type Decimal = Prisma.Decimal;

const ZERO = new Prisma.Decimal(0);

// -----------------------------------------------------------------------------
// Leitura: o pedido sempre sai da API "montado", com os valores derivados
// (status atual, totais, saldo) calculados a partir do que está gravado.
// -----------------------------------------------------------------------------

const inclusaoCompleta = {
  cliente: { select: { id: true, nome: true, telefone: true } },
  mesa: true,
  atendente: { select: { id: true, nome: true } },
  cupom: true,
  itens: {
    orderBy: { id: "asc" },
    include: {
      itemVendavel: true,
      variacao: true,
      adicionais: { include: { adicional: true }, orderBy: { id: "asc" } },
    },
  },
  statusHistorico: { orderBy: [{ dataHora: "asc" }, { id: "asc" }] },
  pagamentos: { include: { formaPagamento: true }, orderBy: { id: "asc" } },
  entrega: { include: { entregador: { select: { id: true, nome: true } } } },
  avaliacao: true,
} satisfies Prisma.PedidoInclude;

type PedidoCompleto = Prisma.PedidoGetPayload<{
  include: typeof inclusaoCompleta;
}>;

const moeda = (valor: Decimal) => valor.toFixed(2);

// Adicionais são cobrados por unidade do item: 2 lanches com bacon extra
// pagam 2 vezes o bacon.
function subtotalDoItem(item: PedidoCompleto["itens"][number]): Decimal {
  const adicionais = item.adicionais.reduce(
    (soma, a) => soma.plus(a.precoPraticado),
    ZERO,
  );
  return item.precoUnitarioPraticado.plus(adicionais).mul(item.quantidade);
}

function calcularTotais(pedido: PedidoCompleto) {
  const subtotalItens = pedido.itens.reduce(
    (soma, item) => soma.plus(subtotalDoItem(item)),
    ZERO,
  );
  // O cupom incide sobre os itens (não sobre a taxa de entrega).
  const descontoCupom = pedido.cupom
    ? calcularDesconto(subtotalItens, pedido.cupom)
    : ZERO;
  const taxaEntrega = pedido.entrega?.taxaEntrega ?? ZERO;
  const total = subtotalItens.minus(descontoCupom).plus(taxaEntrega);
  const totalPago = pedido.pagamentos.reduce(
    (soma, p) => soma.plus(p.valorPago),
    ZERO,
  );
  return {
    subtotalItens,
    descontoCupom,
    taxaEntrega,
    total,
    totalPago,
    saldo: total.minus(totalPago),
  };
}

// Decisão 5 do MER: não existe coluna de status em pedido — o status atual é
// o registro mais recente do histórico.
function statusAtual(pedido: PedidoCompleto): StatusPedido | null {
  const ultimo = pedido.statusHistorico.at(-1);
  return ultimo ? (ultimo.status as StatusPedido) : null;
}

function tipoAtendimento(pedido: PedidoCompleto) {
  if (pedido.entrega) return "ENTREGA";
  if (pedido.mesa) return "CONSUMO_LOCAL";
  return "RETIRADA";
}

function formatar(pedido: PedidoCompleto) {
  const totais = calcularTotais(pedido);

  return {
    id: pedido.id,
    dataHora: pedido.dataHora,
    canal: pedido.canal,
    tipoAtendimento: tipoAtendimento(pedido),
    statusAtual: statusAtual(pedido),
    observacoes: pedido.observacoes,
    cliente: pedido.cliente,
    mesa: pedido.mesa,
    atendente: pedido.atendente,
    cupom: pedido.cupom && {
      id: pedido.cupom.id,
      codigo: pedido.cupom.codigo,
      tipoDesconto: pedido.cupom.tipoDesconto,
      valorDesconto: moeda(pedido.cupom.valorDesconto),
    },
    itens: pedido.itens.map((item) => ({
      id: item.id,
      itemVendavelId: item.itemVendavelId,
      nome: item.itemVendavel.nome,
      tipo: item.itemVendavel.tipo,
      variacao: item.variacao && {
        id: item.variacao.id,
        nome: item.variacao.nome,
      },
      quantidade: item.quantidade,
      precoUnitarioPraticado: moeda(item.precoUnitarioPraticado),
      observacao: item.observacao,
      adicionais: item.adicionais.map((a) => ({
        adicionalId: a.adicionalId,
        nome: a.adicional.nome,
        precoPraticado: moeda(a.precoPraticado),
      })),
      subtotal: moeda(subtotalDoItem(item)),
    })),
    entrega: pedido.entrega && {
      entregador: pedido.entrega.entregador,
      endereco: {
        logradouro: pedido.entrega.enderecoLogradouro,
        numero: pedido.entrega.enderecoNumero,
        bairro: pedido.entrega.enderecoBairro,
        cidade: pedido.entrega.enderecoCidade,
        cep: pedido.entrega.enderecoCep,
      },
      taxaEntrega: moeda(pedido.entrega.taxaEntrega),
      dataHoraSaida: pedido.entrega.dataHoraSaida,
      dataHoraEntrega: pedido.entrega.dataHoraEntrega,
    },
    pagamentos: pedido.pagamentos.map((p) => ({
      id: p.id,
      formaPagamento: p.formaPagamento,
      valorPago: moeda(p.valorPago),
    })),
    avaliacao: pedido.avaliacao && {
      nota: pedido.avaliacao.nota,
      comentario: pedido.avaliacao.comentario,
      dataHora: pedido.avaliacao.dataHora,
    },
    statusHistorico: pedido.statusHistorico.map((s) => ({
      status: s.status,
      dataHora: s.dataHora,
    })),
    totais: {
      subtotalItens: moeda(totais.subtotalItens),
      descontoCupom: moeda(totais.descontoCupom),
      taxaEntrega: moeda(totais.taxaEntrega),
      total: moeda(totais.total),
      totalPago: moeda(totais.totalPago),
      saldo: moeda(totais.saldo),
    },
  };
}

// Trava a linha do pedido até o fim da transação. Sem isso, duas requisições
// simultâneas (dois cliques em "avançar status", dois pagamentos ao mesmo
// tempo) leriam o mesmo estado e ambas passariam na validação.
async function travarPedido(tx: Tx, id: number) {
  const linhas = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM pedido WHERE id = ${id} FOR UPDATE`;
  if (linhas.length === 0) {
    throw new AppError(404, "Pedido não encontrado.");
  }
}

function carregar(tx: Tx, id: number) {
  return tx.pedido.findUniqueOrThrow({
    where: { id },
    include: inclusaoCompleta,
  });
}

// -----------------------------------------------------------------------------
// Criação
// -----------------------------------------------------------------------------

interface ItemPrecificado {
  itemVendavelId: number;
  variacaoId: number | null;
  quantidade: number;
  precoUnitarioPraticado: Decimal;
  observacao: string | null;
  adicionais: { adicionalId: number; precoPraticado: Decimal }[];
}

// Define o preço "congelado" de cada item (decisão 4 do MER):
//   produto: preço-base, com a melhor promoção vigente hoje (não acumulam),
//            mais o acréscimo da variação escolhida;
//   combo:   o preço promocional do próprio combo.
async function precificarItens(
  tx: Tx,
  itens: CriarPedidoDTO["itens"],
  hoje: Date,
): Promise<ItemPrecificado[]> {
  const idsVendaveis = [...new Set(itens.map((i) => i.itemVendavelId))];
  const vendaveis = await tx.itemVendavel.findMany({
    where: { id: { in: idsVendaveis } },
    include: {
      produto: {
        include: {
          variacoes: true,
          produtoPromocoes: {
            where: {
              promocao: { dataInicio: { lte: hoje }, dataFim: { gte: hoje } },
            },
            include: { promocao: true },
          },
        },
      },
    },
  });
  const vendavelPorId = new Map(vendaveis.map((v) => [v.id, v]));

  const idsAdicionais = [...new Set(itens.flatMap((i) => i.adicionalIds))];
  const adicionais = await tx.adicional.findMany({
    where: { id: { in: idsAdicionais } },
  });
  const adicionalPorId = new Map(adicionais.map((a) => [a.id, a]));

  return itens.map((item) => {
    const vendavel = vendavelPorId.get(item.itemVendavelId);
    if (!vendavel) {
      throw new AppError(
        400,
        `Item ${item.itemVendavelId} não existe no cardápio.`,
      );
    }

    let preco = vendavel.preco;

    if (vendavel.produto) {
      for (const { promocao } of vendavel.produto.produtoPromocoes) {
        const comPromocao = vendavel.preco.minus(
          calcularDesconto(vendavel.preco, promocao),
        );
        preco = Prisma.Decimal.min(preco, comPromocao);
      }
    }

    if (item.variacaoId != null) {
      const variacao = vendavel.produto?.variacoes.find(
        (v) => v.id === item.variacaoId,
      );
      if (!variacao) {
        throw new AppError(
          400,
          `Variação ${item.variacaoId} não pertence ao item "${vendavel.nome}".`,
        );
      }
      preco = preco.plus(variacao.precoAdicional);
    }

    return {
      itemVendavelId: vendavel.id,
      variacaoId: item.variacaoId ?? null,
      quantidade: item.quantidade,
      precoUnitarioPraticado: preco,
      observacao: item.observacao ?? null,
      adicionais: item.adicionalIds.map((adicionalId) => {
        const adicional = adicionalPorId.get(adicionalId);
        if (!adicional) {
          throw new AppError(400, `Adicional ${adicionalId} não existe.`);
        }
        return { adicionalId, precoPraticado: adicional.preco };
      }),
    };
  });
}

async function validarCupom(
  tx: Tx,
  codigo: string,
  clienteId: number,
  hoje: Date,
) {
  const cupom = await tx.cupom.findUnique({ where: { codigo } });
  if (!cupom) {
    throw new AppError(400, `Cupom "${codigo}" não existe.`);
  }
  if (!estaVigente(cupom, hoje)) {
    throw new AppError(409, "Cupom fora do período de validade.");
  }
  // Mensagem amigável para o caso comum; a garantia real (inclusive contra
  // requisições simultâneas) é o índice único parcial ux_pedido_cupom_cliente.
  const usoAnterior = await tx.pedido.findFirst({
    where: { cupomId: cupom.id, clienteId },
    select: { id: true },
  });
  if (usoAnterior) {
    throw new AppError(409, "Este cliente já utilizou este cupom.");
  }
  return cupom;
}

// Decisão 6 do MER: a entrega guarda o próprio endereço, congelado no momento
// do pedido. O endereço padrão do cliente só serve de valor inicial.
function resolverEndereco(
  entrega: NonNullable<CriarPedidoDTO["entrega"]>,
  cliente: Prisma.ClienteGetPayload<object>,
) {
  if (entrega.endereco) {
    return {
      enderecoLogradouro: entrega.endereco.logradouro,
      enderecoNumero: entrega.endereco.numero,
      enderecoBairro: entrega.endereco.bairro,
      enderecoCidade: entrega.endereco.cidade,
      enderecoCep: entrega.endereco.cep,
    };
  }

  const {
    enderecoPadraoLogradouro,
    enderecoPadraoNumero,
    enderecoPadraoBairro,
    enderecoPadraoCidade,
    enderecoPadraoCep,
  } = cliente;
  if (
    !enderecoPadraoLogradouro ||
    !enderecoPadraoNumero ||
    !enderecoPadraoBairro ||
    !enderecoPadraoCidade ||
    !enderecoPadraoCep
  ) {
    throw new AppError(
      400,
      "Informe o endereço de entrega: o cliente não tem endereço padrão completo no cadastro.",
    );
  }
  return {
    enderecoLogradouro: enderecoPadraoLogradouro,
    enderecoNumero: enderecoPadraoNumero,
    enderecoBairro: enderecoPadraoBairro,
    enderecoCidade: enderecoPadraoCidade,
    enderecoCep: enderecoPadraoCep,
  };
}

async function exigirFuncionario(tx: Tx, id: number, papel: string) {
  const funcionario = await tx.funcionario.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!funcionario) {
    throw new AppError(400, `${papel} ${id} não existe.`);
  }
}

async function exigirFormasDePagamento(tx: Tx, ids: number[]) {
  const unicos = [...new Set(ids)];
  const encontradas = await tx.formaPagamento.findMany({
    where: { id: { in: unicos } },
    select: { id: true },
  });
  const existentes = new Set(encontradas.map((f) => f.id));
  const faltando = unicos.filter((id) => !existentes.has(id));
  if (faltando.length > 0) {
    throw new AppError(
      400,
      `Forma(s) de pagamento inexistente(s): ${faltando.join(", ")}.`,
    );
  }
}

export async function criar(dados: CriarPedidoDTO) {
  const pedido = await prisma.$transaction(async (tx) => {
    const hoje = hojeComoData();

    await exigirFuncionario(tx, dados.atendenteId, "Atendente");

    const cliente =
      dados.clienteId != null
        ? await tx.cliente.findUnique({ where: { id: dados.clienteId } })
        : null;
    if (dados.clienteId != null && !cliente) {
      throw new AppError(400, `Cliente ${dados.clienteId} não existe.`);
    }

    if (dados.mesaId != null) {
      const mesa = await tx.mesa.findUnique({ where: { id: dados.mesaId } });
      if (!mesa) {
        throw new AppError(400, `Mesa ${dados.mesaId} não existe.`);
      }
      if (!mesa.ativa) {
        throw new AppError(409, `A mesa ${mesa.numero} está inativa.`);
      }
    }

    const itens = await precificarItens(tx, dados.itens, hoje);
    const subtotalItens = itens.reduce(
      (soma, item) =>
        soma.plus(
          item.adicionais
            .reduce((s, a) => s.plus(a.precoPraticado), ZERO)
            .plus(item.precoUnitarioPraticado)
            .mul(item.quantidade),
        ),
      ZERO,
    );

    // O validator já garante cliente quando há cupom ou entrega; a checagem
    // aqui existe para o TypeScript e como segunda barreira.
    const cupom =
      dados.cupomCodigo && cliente
        ? await validarCupom(tx, dados.cupomCodigo, cliente.id, hoje)
        : null;

    let entrega = null;
    if (dados.entrega && cliente) {
      await exigirFuncionario(tx, dados.entrega.entregadorId, "Entregador");
      entrega = {
        entregadorId: dados.entrega.entregadorId,
        taxaEntrega: dados.entrega.taxaEntrega,
        ...resolverEndereco(dados.entrega, cliente),
      };
    }

    if (dados.pagamentos.length > 0) {
      await exigirFormasDePagamento(
        tx,
        dados.pagamentos.map((p) => p.formaPagamentoId),
      );
      const total = subtotalItens
        .minus(cupom ? calcularDesconto(subtotalItens, cupom) : ZERO)
        .plus(entrega?.taxaEntrega ?? 0);
      const totalPago = dados.pagamentos.reduce(
        (soma, p) => soma.plus(p.valorPago),
        ZERO,
      );
      if (totalPago.greaterThan(total)) {
        throw new AppError(
          409,
          `A soma dos pagamentos (R$ ${moeda(totalPago)}) passa do total do pedido (R$ ${moeda(total)}).`,
        );
      }
    }

    // Um único create aninhado: pedido, itens, adicionais, status inicial,
    // entrega e pagamentos nascem juntos ou nada é gravado.
    return tx.pedido.create({
      data: {
        canal: dados.canal,
        clienteId: cliente?.id ?? null,
        mesaId: dados.mesaId ?? null,
        atendenteId: dados.atendenteId,
        cupomId: cupom?.id ?? null,
        observacoes: dados.observacoes ?? null,
        statusHistorico: { create: { status: "RECEBIDO" } },
        itens: {
          create: itens.map(({ adicionais, ...item }) => ({
            ...item,
            adicionais: { create: adicionais },
          })),
        },
        ...(entrega ? { entrega: { create: entrega } } : {}),
        pagamentos: { create: dados.pagamentos },
      },
      include: inclusaoCompleta,
    });
  });

  return formatar(pedido);
}

// -----------------------------------------------------------------------------
// Consulta
// -----------------------------------------------------------------------------

export async function buscarPorId(id: number) {
  return formatar(await carregar(prisma, id));
}

// A paginação e os filtros rodam em SQL direto porque "status atual" não é
// uma coluna: é o último registro do histórico de cada pedido, algo que o
// `where` do Prisma não consegue expressar. Os valores entram sempre como
// parâmetros (Prisma.sql), nunca concatenados na string.
export async function listar(filtros: ListarPedidosQuery) {
  const { pagina, tamanhoPagina, status, clienteId, dataInicio, dataFim } =
    filtros;

  const condicoes: Prisma.Sql[] = [];
  if (clienteId !== undefined) {
    condicoes.push(Prisma.sql`p.cliente_id = ${clienteId}`);
  }
  if (dataInicio) {
    const desde = inicioDoDia(dataInicio).toISOString();
    condicoes.push(Prisma.sql`p.data_hora >= ${desde}::timestamp`);
  }
  if (dataFim) {
    const ate = inicioDoDia(somarDias(dataFim, 1)).toISOString();
    condicoes.push(Prisma.sql`p.data_hora < ${ate}::timestamp`);
  }
  if (status) {
    condicoes.push(Prisma.sql`(
      SELECT s.status FROM status_pedido_historico s
      WHERE s.pedido_id = p.id
      ORDER BY s.data_hora DESC, s.id DESC
      LIMIT 1
    ) = ${status}`);
  }
  const where =
    condicoes.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(condicoes, " AND ")}`
      : Prisma.empty;

  const [linhas, contagem] = await Promise.all([
    prisma.$queryRaw<{ id: number }[]>`
      SELECT p.id FROM pedido p ${where}
      ORDER BY p.data_hora DESC, p.id DESC
      LIMIT ${tamanhoPagina} OFFSET ${(pagina - 1) * tamanhoPagina}`,
    prisma.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM pedido p ${where}`,
  ]);

  const ids = linhas.map((l) => l.id);
  const pedidos = await prisma.pedido.findMany({
    where: { id: { in: ids } },
    include: inclusaoCompleta,
  });
  const pedidoPorId = new Map(pedidos.map((p) => [p.id, p]));

  return {
    dados: ids.flatMap((id) => {
      const pedido = pedidoPorId.get(id);
      return pedido ? [formatar(pedido)] : [];
    }),
    paginacao: {
      pagina,
      tamanhoPagina,
      total: contagem[0]?.total ?? 0,
    },
  };
}

// Regra 4.1: histórico de pedidos de um cliente cadastrado.
export async function listarPorCliente(
  clienteId: number,
  filtros: ListarPedidosQuery,
) {
  await prisma.cliente.findUniqueOrThrow({
    where: { id: clienteId },
    select: { id: true },
  });
  return listar({ ...filtros, clienteId });
}

// -----------------------------------------------------------------------------
// Status
// -----------------------------------------------------------------------------

const TRANSICOES: Record<StatusPedido, StatusPedido[]> = {
  RECEBIDO: ["EM_PREPARO", "CANCELADO"],
  EM_PREPARO: ["PRONTO", "CANCELADO"],
  PRONTO: ["SAIU_PARA_ENTREGA", "ENTREGUE_RETIRADO", "CANCELADO"],
  SAIU_PARA_ENTREGA: ["ENTREGUE_RETIRADO", "CANCELADO"],
  ENTREGUE_RETIRADO: [],
  CANCELADO: [],
};

function validarTransicao(
  atual: StatusPedido | null,
  novo: StatusPedido,
  temEntrega: boolean,
) {
  const permitidos = atual ? TRANSICOES[atual] : ["RECEBIDO"];
  if (!permitidos.includes(novo)) {
    throw new AppError(
      409,
      `Transição de status inválida: ${atual ?? "(sem status)"} -> ${novo}.`,
    );
  }
  if (novo === "SAIU_PARA_ENTREGA" && !temEntrega) {
    throw new AppError(
      409,
      "Este pedido não é de entrega: de PRONTO ele vai direto para ENTREGUE_RETIRADO.",
    );
  }
  if (atual === "PRONTO" && novo === "ENTREGUE_RETIRADO" && temEntrega) {
    throw new AppError(
      409,
      "Pedido de entrega precisa passar por SAIU_PARA_ENTREGA antes de ser entregue.",
    );
  }
}

// Nunca altera o registro anterior: cada mudança é uma linha nova no
// histórico, com seu horário (regra 4.3).
export async function atualizarStatus(id: number, novo: StatusPedido) {
  const pedido = await prisma.$transaction(async (tx) => {
    await travarPedido(tx, id);
    const atual = await carregar(tx, id);
    validarTransicao(statusAtual(atual), novo, atual.entrega !== null);

    await tx.statusPedidoHistorico.create({
      data: { pedidoId: id, status: novo },
    });

    if (atual.entrega && novo === "SAIU_PARA_ENTREGA") {
      await tx.entrega.update({
        where: { pedidoId: id },
        data: { dataHoraSaida: new Date() },
      });
    }
    if (atual.entrega && novo === "ENTREGUE_RETIRADO") {
      await tx.entrega.update({
        where: { pedidoId: id },
        data: { dataHoraEntrega: new Date() },
      });
    }
    // Pedido cancelado devolve o cupom ao cliente: o índice único parcial
    // (cupom_id, cliente_id) não enxerga status, então sem isso o cupom
    // ficaria "queimado" por um pedido que nunca foi concluído.
    if (novo === "CANCELADO" && atual.cupomId !== null) {
      await tx.pedido.update({ where: { id }, data: { cupomId: null } });
    }

    return carregar(tx, id);
  });

  return formatar(pedido);
}

// -----------------------------------------------------------------------------
// Pagamento, entrega e avaliação
// -----------------------------------------------------------------------------

// Regra 4.3: um pedido pode ser pago em várias formas; cada chamada registra
// uma parcela. A soma nunca pode passar do total.
export async function adicionarPagamento(id: number, dados: PagamentoDTO) {
  const pedido = await prisma.$transaction(async (tx) => {
    await travarPedido(tx, id);
    const atual = await carregar(tx, id);

    if (statusAtual(atual) === "CANCELADO") {
      throw new AppError(409, "Pedido cancelado não recebe pagamento.");
    }
    await exigirFormasDePagamento(tx, [dados.formaPagamentoId]);

    const { saldo } = calcularTotais(atual);
    if (new Prisma.Decimal(dados.valorPago).greaterThan(saldo)) {
      throw new AppError(
        409,
        `Valor maior que o saldo em aberto do pedido (R$ ${moeda(saldo)}).`,
      );
    }

    await tx.pedidoPagamento.create({ data: { ...dados, pedidoId: id } });
    return carregar(tx, id);
  });

  return formatar(pedido);
}

// O schema exige entregador desde a criação da entrega; este endpoint permite
// trocá-lo enquanto o pedido ainda não saiu.
export async function trocarEntregador(id: number, entregadorId: number) {
  const pedido = await prisma.$transaction(async (tx) => {
    await travarPedido(tx, id);
    const atual = await carregar(tx, id);

    if (!atual.entrega) {
      throw new AppError(409, "Este pedido não é de entrega.");
    }
    const status = statusAtual(atual);
    if (
      status === "SAIU_PARA_ENTREGA" ||
      status === "ENTREGUE_RETIRADO" ||
      status === "CANCELADO"
    ) {
      throw new AppError(
        409,
        `Não é possível trocar o entregador de um pedido ${status}.`,
      );
    }
    await exigirFuncionario(tx, entregadorId, "Entregador");

    await tx.entrega.update({
      where: { pedidoId: id },
      data: { entregadorId },
    });
    return carregar(tx, id);
  });

  return formatar(pedido);
}

// Regra 4.3: avaliação opcional, "ao final do atendimento" — só depois de
// entregue/retirado, e uma única vez por pedido.
export async function avaliar(id: number, dados: AvaliarPedidoDTO) {
  const pedido = await prisma.$transaction(async (tx) => {
    await travarPedido(tx, id);
    const atual = await carregar(tx, id);

    if (statusAtual(atual) !== "ENTREGUE_RETIRADO") {
      throw new AppError(
        409,
        "O pedido só pode ser avaliado depois de entregue ou retirado.",
      );
    }
    if (atual.avaliacao) {
      throw new AppError(409, "Este pedido já foi avaliado.");
    }

    await tx.avaliacaoPedido.create({ data: { ...dados, pedidoId: id } });
    return carregar(tx, id);
  });

  return formatar(pedido);
}
