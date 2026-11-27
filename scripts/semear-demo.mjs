// Dados de demonstração para testar as telas no navegador (Sabor & Cia).
//
// Uso, com o sistema no ar e o banco recém-criado (rode uma vez só; para
// recomeçar, `docker compose down -v` e suba de novo):
//   API_URL=http://localhost:8080/api ADMIN_LOGIN=gerente ADMIN_SENHA=... node scripts/semear-demo.mjs
//
// Cria 4 funcionários (senha "senha12345"), cardápio, combo, promoção, cupom
// BEMVINDO10, 12 mesas, estoque com mínimos, 3 clientes e 7 pedidos em
// vários status. Fala só com a API, como as telas: valida as mesmas regras.
const API = process.env.API_URL ?? "http://localhost:8080/api";
async function req(metodo, caminho, corpo, token) {
  const r = await fetch(API + caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const t = await r.text();
  const j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Error(`${metodo} ${caminho} ${r.status} ${t}`);
  return j;
}
const login = async (l, s) =>
  (await req("POST", "/auth/login", { login: l, senha: s })).token;
const adm = await login(
  process.env.ADMIN_LOGIN ?? "admin",
  process.env.ADMIN_SENHA ?? "admin12345",
);
const g = (m, c, b) => req(m, c, b, adm);

const cats = Object.fromEntries(
  (await g("GET", "/categorias")).dados.map((c) => [c.nome, c.id]),
);
const cargos = Object.fromEntries(
  (await g("GET", "/cargos")).dados.map((c) => [c.nome, c.id]),
);
const formas = Object.fromEntries(
  (await g("GET", "/formas-pagamento")).dados.map((c) => [c.nome, c.id]),
);

const pessoas = {};
for (const [nome, l, cargo] of [
  ["Ana Lima", "ana", "atendente"],
  ["Bruno Costa", "bruno", "cozinheiro"],
  ["Carlos Souza", "carlos", "entregador"],
  ["Diego Alves", "diego", "entregador"],
]) {
  const f = await g("POST", "/funcionarios", {
    nome,
    login: l,
    senha: "senha12345",
  });
  await g("POST", `/funcionarios/${f.id}/cargos`, { cargoId: cargos[cargo] });
  pessoas[l] = f.id;
}

const prod = async (nome, cat, preco, descricao) =>
  g("POST", "/produtos", { nome, categoriaId: cats[cat], preco, descricao });
const xbacon = await prod(
  "X-Bacon da Casa",
  "Lanches",
  28.9,
  "Brioche, blend 160 g, bacon e cheddar",
);
const xsalada = await prod(
  "X-Salada",
  "Lanches",
  22.9,
  "Brioche, blend 160 g, queijo, alface e tomate",
);
const frango = await prod(
  "X-Frango Crocante",
  "Lanches",
  24.9,
  "Filé empanado, maionese verde e alface",
);
await prod(
  "Smash Duplo",
  "Lanches",
  31.9,
  "Dois smash de 90 g, cheddar e picles",
);
const refri = await prod("Refrigerante lata", "Bebidas", 6.9, "350 ml, gelado");
const suco = await prod("Suco de laranja", "Bebidas", 9.9, "400 ml, natural");
await prod("Milkshake de morango", "Bebidas", 16.9, "400 ml, com chantilly");
const fritas = await prod(
  "Fritas média",
  "Porções",
  14.9,
  "Batata crocante com sal",
);
await prod("Onion rings", "Porções", 19.9, "Anéis de cebola empanados");
await prod(
  "Brownie com sorvete",
  "Sobremesas",
  15.9,
  "Brownie quente e sorvete de creme",
);

const simples = await g("POST", `/produtos/${xbacon.id}/variacoes`, {
  nome: "Simples",
  precoAdicional: 0,
});
await g("POST", `/produtos/${xbacon.id}/variacoes`, {
  nome: "Duplo",
  precoAdicional: 9,
});

const queijo = await g("POST", "/adicionais", {
  nome: "Queijo extra",
  preco: 3.5,
  categoriaIds: [cats.Lanches],
});
await g("POST", "/adicionais", {
  nome: "Bacon extra",
  preco: 4.5,
  categoriaIds: [cats.Lanches],
});
await g("POST", "/adicionais", {
  nome: "Cheddar na batata",
  preco: 5,
  categoriaIds: [cats["Porções"]],
});
await g("POST", "/adicionais", {
  nome: "Gelo e limão",
  preco: 0,
  categoriaIds: [cats.Bebidas],
});

const combo = await g("POST", "/combos", {
  nome: "Combo Sabor",
  preco: 36.9,
  descricao: "X-Salada, fritas média e refrigerante lata",
  itens: [
    { produtoId: xsalada.id },
    { produtoId: fritas.id },
    { produtoId: refri.id },
  ],
});
// Dia no fuso do negócio: depois das 21h de Brasília, o dia UTC já é amanhã.
const diaSP = (ms) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(ms),
  );
const hoje = diaSP(Date.now());
const fimMes = diaSP(Date.now() + 20 * 864e5);
await g("POST", "/promocoes", {
  nome: "Quarta do frango",
  dataInicio: hoje,
  dataFim: fimMes,
  tipoDesconto: "PERCENTUAL",
  valorDesconto: 15,
  produtoIds: [frango.id],
});
await g("POST", "/cupons", {
  codigo: "BEMVINDO10",
  tipoDesconto: "PERCENTUAL",
  valorDesconto: 10,
  dataInicio: hoje,
  dataFim: fimMes,
});

for (let n = 1; n <= 12; n++) await g("POST", "/mesas", { numero: n });
const mesas = (await g("GET", "/mesas?tamanhoPagina=100")).dados;

const forn1 = await g("POST", "/fornecedores", {
  nome: "Padaria Pão Bom",
  telefone: "11999990001",
});
const forn2 = await g("POST", "/fornecedores", {
  nome: "Frigorífico Boi Bom",
  telefone: "11999990002",
});
const forn3 = await g("POST", "/fornecedores", { nome: "Hortifruti Verde" });
const ing = async (nome, q, u, f, min) =>
  g("POST", "/ingredientes", {
    nome,
    quantidadeEstoque: q,
    estoqueMinimo: min,
    unidadeMedida: u,
    fornecedorId: f,
  });
const pao = await ing("Pão brioche", 40, "unidade", forn1.id, 30);
const carne = await ing("Blend 160 g", 6.5, "kg", forn2.id, 3);
const baconI = await ing("Bacon fatiado", 1.2, "kg", forn2.id, 1.5);
const alface = await ing("Alface", 0.8, "kg", forn3.id, 0.5);
await ing("Tomate", 3, "kg", forn3.id, 1);
const batata = await ing("Batata palito", 12, "kg", forn3.id, 5);
for (const [p, i, q] of [
  [xbacon, pao, 1],
  [xbacon, carne, 0.16],
  [xbacon, baconI, 0.04],
  [xsalada, pao, 1],
  [xsalada, carne, 0.16],
  [xsalada, alface, 0.02],
  [fritas, batata, 0.25],
]) {
  await g("PUT", `/produtos/${p.id}/ingredientes/${i.id}`, {
    quantidadeUtilizada: q,
  });
}

const cli = async (nome, telefone, end) =>
  g("POST", "/clientes", {
    nome,
    telefone,
    ...(end
      ? {
          enderecoPadraoLogradouro: end[0],
          enderecoPadraoNumero: end[1],
          enderecoPadraoBairro: end[2],
          enderecoPadraoCidade: "São Paulo",
          enderecoPadraoCep: "01000-000",
        }
      : {}),
  });
const maria = await cli("Maria Souza", "11987654321", [
  "Rua das Palmeiras",
  "120",
  "Centro",
]);
const joao = await cli("João Pereira", "11912345678", [
  "Av. Brasil",
  "845",
  "Jardim América",
]);
await cli("Carla Mendes", "11955554444");

const ana = await login("ana", "senha12345");
const pedir = (corpo) => req("POST", "/pedidos", corpo, ana);
const status = (id, s) =>
  req("POST", `/pedidos/${id}/status`, { status: s }, ana);
const p1 = await pedir({
  canal: "BALCAO",
  mesaId: mesas[6].id,
  itens: [
    {
      itemVendavelId: xbacon.id,
      quantidade: 2,
      variacaoId: simples.id,
      adicionalIds: [queijo.id],
      observacao: "Ao ponto · sem cebola",
    },
    { itemVendavelId: fritas.id, quantidade: 1 },
  ],
});
await status(p1.id, "EM_PREPARO");
const p2 = await pedir({
  canal: "TELEFONE",
  clienteId: maria.id,
  itens: [
    { itemVendavelId: combo.id, quantidade: 1 },
    { itemVendavelId: suco.id, quantidade: 1 },
  ],
  entrega: { taxaEntrega: 6 },
  pagamentos: [{ formaPagamentoId: formas.pix, valorPago: 52.8 }],
});
await status(p2.id, "EM_PREPARO");
await status(p2.id, "PRONTO");
await req(
  "PATCH",
  `/pedidos/${p2.id}/entrega`,
  { entregadorId: pessoas.carlos },
  ana,
);
await status(p2.id, "SAIU_PARA_ENTREGA");
const p3 = await pedir({
  canal: "APP",
  clienteId: joao.id,
  itens: [{ itemVendavelId: xsalada.id, quantidade: 2 }],
  entrega: { taxaEntrega: 6 },
});
await status(p3.id, "EM_PREPARO");
await status(p3.id, "PRONTO");
await pedir({
  canal: "BALCAO",
  mesaId: mesas[2].id,
  itens: [
    { itemVendavelId: xsalada.id, quantidade: 1 },
    { itemVendavelId: refri.id, quantidade: 1, observacao: "sem gelo" },
  ],
});
await pedir({
  canal: "APP",
  clienteId: joao.id,
  cupomCodigo: "BEMVINDO10",
  itens: [{ itemVendavelId: fritas.id, quantidade: 2 }],
});
const p6 = await pedir({
  canal: "BALCAO",
  clienteId: maria.id,
  itens: [{ itemVendavelId: frango.id, quantidade: 1 }],
  pagamentos: [{ formaPagamentoId: formas.dinheiro, valorPago: 21.16 }],
});
for (const s of ["EM_PREPARO", "PRONTO", "ENTREGUE_RETIRADO"])
  await status(p6.id, s);
await req(
  "POST",
  `/pedidos/${p6.id}/avaliacao`,
  { nota: 5, comentario: "Muito bom!" },
  ana,
);
const p7 = await pedir({
  canal: "BALCAO",
  itens: [{ itemVendavelId: refri.id, quantidade: 3 }],
});
await status(p7.id, "CANCELADO");
console.log("ok", { pedidos: [p1.id, p2.id, p3.id, p6.id, p7.id] });
