import { Prisma } from "@prisma/client";
import { prisma, type Tx } from "../lib/prisma.js";
import { AppError } from "../lib/appError.js";
import { CARGO, vinculoVigente, type NomeDeCargo } from "../lib/cargos.js";
import { hojeComoData, inicioDoDia, somarDias } from "../lib/datas.js";
import { calcularDesconto, estaVigente } from "../lib/desconto.js";
import { paginar, recorte } from "../lib/paginacao.js";
import type { UsuarioAutenticado } from "../middlewares/autenticacao.js";
import type {
  AvaliarPedidoDTO,
  CriarPedidoDTO,
  ListarPedidosQuery,
  PagamentoDTO,
  StatusPedido,
} from "../validators/pedido.validator.js";

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

  // Pagamento estornado (pedido cancelado depois de pago) continua
  // registrado, mas não conta mais como valor pago.
  let totalPago = ZERO;
  let totalEstornado = ZERO;
  for (const pagamento of pedido.pagamentos) {
    if (pagamento.estornadoEm === null) {
      totalPago = totalPago.plus(pagamento.valorPago);
    } else {
      totalEstornado = totalEstornado.plus(pagamento.valorPago);
    }
  }

  return {
    subtotalItens,
    descontoCupom,
    taxaEntrega,
    total,
    totalPago,
    totalEstornado,
    // Pedido cancelado não tem nada a receber.
    saldo: pedido.statusAtual === "CANCELADO" ? ZERO : total.minus(totalPago),
  };
}

// Decisão 5 do MER (revisada): o histórico continua sendo a fonte da verdade,
// e pedido.status_atual é uma cópia do último registro, mantida por trigger
// no banco. A aplicação só LÊ essa coluna — para mudar o status, insere uma
// linha no histórico.
function statusAtual(pedido: { statusAtual: string }): StatusPedido {
  return pedido.statusAtual as StatusPedido;
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
      estornadoEm: p.estornadoEm,
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
      totalEstornado: moeda(totais.totalEstornado),
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
      // Para recusar combo que contenha produto fora do cardápio.
      combo: {
        include: {
          comboItens: {
            include: { produto: { include: { itemVendavel: true } } },
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
    // Item desativado continua no banco (por causa dos pedidos antigos), mas
    // não entra em pedido novo.
    if (!vendavel.ativo) {
      throw new AppError(409, `"${vendavel.nome}" está fora do cardápio.`);
    }
    const componenteInativo = vendavel.combo?.comboItens.find(
      (ci) => !ci.produto.itemVendavel.ativo,
    );
    if (componenteInativo) {
      throw new AppError(
        409,
        `O combo "${vendavel.nome}" está indisponível: "${componenteInativo.produto.itemVendavel.nome}" está fora do cardápio.`,
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
        if (!adicional.ativo) {
          throw new AppError(
            409,
            `O adicional "${adicional.nome}" está fora do cardápio.`,
          );
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

// Regras 4.3/4.4/4.5: o pedido registra "o atendente" e a entrega "o
// entregador" — não um funcionário qualquer. Exige que a pessoa exista,
// esteja ativa e exerça HOJE o cargo correspondente.
async function exigirFuncionarioComCargo(
  tx: Tx,
  id: number,
  cargo: NomeDeCargo,
  hoje: Date,
) {
  const funcionario = await tx.funcionario.findUnique({
    where: { id },
    select: {
      nome: true,
      ativo: true,
      funcionarioCargos: {
        where: { ...vinculoVigente(hoje), cargo: { nome: cargo } },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!funcionario) {
    throw new AppError(400, `Funcionário ${id} não existe.`);
  }
  if (!funcionario.ativo) {
    throw new AppError(409, `${funcionario.nome} está desativado(a).`);
  }
  if (funcionario.funcionarioCargos.length === 0) {
    throw new AppError(
      409,
      `${funcionario.nome} não exerce o cargo de ${cargo} hoje.`,
    );
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

// `usuario` é quem está logado. Se o corpo não disser quem atendeu, o
// atendente é o próprio usuário — o caso normal no balcão. Informar outro
// atendenteId serve, por exemplo, para o gerente lançar um pedido anotado por
// um colega.
export async function criar(dados: CriarPedidoDTO, usuario: UsuarioAutenticado) {
  const pedido = await prisma.$transaction(async (tx) => {
    const hoje = hojeComoData();

    const atendenteId = dados.atendenteId ?? usuario.id;
    await exigirFuncionarioComCargo(tx, atendenteId, CARGO.ATENDENTE, hoje);

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
      // O entregador pode ser definido depois (PATCH /pedidos/:id/entrega):
      // na hora do pedido nem sempre se sabe quem estará livre.
      const entregadorId = dados.entrega.entregadorId ?? null;
      if (entregadorId !== null) {
        await exigirFuncionarioComCargo(tx, entregadorId, CARGO.ENTREGADOR, hoje);
      }
      entrega = {
        entregadorId,
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

    // Um único create aninhado: pedido, itens, adicionais, entrega e
    // pagamentos nascem juntos ou nada é gravado. O status inicial
    // (RECEBIDO) não aparece aqui: quem o grava no histórico é o trigger
    // trg_pedido_status_inicial, no banco — assim nenhum pedido existe sem
    // histórico, seja qual for o caminho por onde foi inserido.
    const criado = await tx.pedido.create({
      data: {
        canal: dados.canal,
        clienteId: cliente?.id ?? null,
        mesaId: dados.mesaId ?? null,
        atendenteId,
        cupomId: cupom?.id ?? null,
        observacoes: dados.observacoes ?? null,
        itens: {
          create: itens.map(({ adicionais, ...item }) => ({
            ...item,
            adicionais: { create: adicionais },
          })),
        },
        ...(entrega ? { entrega: { create: entrega } } : {}),
        pagamentos: { create: dados.pagamentos },
      },
      select: { id: true },
    });

    // Relê depois do insert, já com o que os triggers gravaram.
    return carregar(tx, criado.id);
  });

  return formatar(pedido);
}

// -----------------------------------------------------------------------------
// Consulta
// -----------------------------------------------------------------------------

export async function buscarPorId(id: number) {
  return formatar(await carregar(prisma, id));
}

// Com pedido.status_atual (coluna mantida por trigger), o filtro por status é
// um `where` comum, atendido pelo índice (status_atual, data_hora) — antes
// era preciso uma subconsulta no histórico para cada pedido.
export async function listar(filtros: ListarPedidosQuery) {
  const { status, clienteId, dataInicio, dataFim, ...pagina } = filtros;

  // O período é informado em DIAS no fuso do negócio; data_hora é um
  // instante (TIMESTAMPTZ). inicioDoDia faz a conversão.
  const periodo: Prisma.DateTimeFilter = {};
  if (dataInicio) periodo.gte = inicioDoDia(dataInicio);
  if (dataFim) periodo.lt = inicioDoDia(somarDias(dataFim, 1));

  const where: Prisma.PedidoWhereInput = {
    ...(status === undefined ? {} : { statusAtual: status }),
    ...(clienteId === undefined ? {} : { clienteId }),
    ...(dataInicio || dataFim ? { dataHora: periodo } : {}),
  };

  const [pedidos, total] = await prisma.$transaction([
    prisma.pedido.findMany({
      where,
      include: inclusaoCompleta,
      orderBy: [{ dataHora: "desc" }, { id: "desc" }],
      ...recorte(pagina),
    }),
    prisma.pedido.count({ where }),
  ]);

  return paginar(pedidos.map(formatar), total, pagina);
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
  atual: StatusPedido,
  novo: StatusPedido,
  temEntrega: boolean,
) {
  if (!TRANSICOES[atual].includes(novo)) {
    throw new AppError(
      409,
      `Transição de status inválida: ${atual} -> ${novo}.`,
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

    if (novo === "SAIU_PARA_ENTREGA" && atual.entrega?.entregadorId == null) {
      throw new AppError(
        409,
        "Defina o entregador (PATCH /pedidos/:id/entrega) antes de o pedido sair para entrega.",
      );
    }

    // Só o histórico é gravado: o trigger do banco copia o novo status para
    // pedido.status_atual.
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
    // Cancelar um pedido já pago (no todo ou em parte) gera a devolução do
    // dinheiro. Os pagamentos não são apagados: ficam marcados como
    // estornados, com a data — entrada e saída do caixa ficam registradas.
    if (novo === "CANCELADO") {
      await tx.pedidoPagamento.updateMany({
        where: { pedidoId: id, estornadoEm: null },
        data: { estornadoEm: new Date() },
      });
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

// Define, troca ou retira (null) o entregador enquanto o pedido ainda não
// saiu. É aqui que se preenche o entregador de uma entrega criada sem ele.
export async function definirEntregador(id: number, entregadorId: number | null) {
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
        `Não é possível alterar o entregador de um pedido ${status}.`,
      );
    }
    if (entregadorId !== null) {
      await exigirFuncionarioComCargo(
        tx,
        entregadorId,
        CARGO.ENTREGADOR,
        hojeComoData(),
      );
    }

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
