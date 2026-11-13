# LanchoneteSystem

Sistema acadêmico de gestão para a **Lanchonete Sabor & Cia**, desenvolvido para aplicar modelagem de banco de dados (MER/DER/3FN) e implementação fullstack com deploy em Docker Compose.

## Contexto do projeto

Este repositório implementa a situação de aprendizagem descrita em `docs/Análise de requisitos.md`: transformar regras de negócio reais de uma lanchonete em:

- modelo conceitual (MER);
- modelo lógico relacional normalizado;
- documentação técnica de apoio;
- backend conectado a PostgreSQL;
- frontend web (estrutura inicial já criada).

O foco principal é garantir consistência entre **regras de negócio**, **schema do banco** e **camada de aplicação**.

## Objetivos funcionais (resumo)

O domínio contempla:

- cadastro de clientes, equipe, fornecedores, ingredientes e itens do cardápio;
- pedidos com itens, adicionais, formas de pagamento e cupom;
- histórico de status do pedido ao longo do tempo;
- controle de combos, promoções e ficha técnica de ingredientes por produto;
- suporte a consumo local e delivery.

## Arquitetura do repositório

```text
LachoneteSystem/
├── backend/                # API Node.js + TypeScript + Express + Prisma Client
│   └── tests/e2e/          # Testes automatizados de ponta a ponta
├── database/
│   └── init/
│       ├── 001_schema.sql  # Schema SQL (fonte da verdade do banco)
│       └── 002_seed.sql    # Dados iniciais: cargos, formas de pagamento, categorias
├── docs/                   # Artefatos de modelagem e justificativas
├── frontend/               # Estrutura inicial do frontend
├── scripts/                # Scripts utilitários de estrutura
├── docker-compose.yml      # Orquestra backend + PostgreSQL
└── .env.example            # Variáveis de ambiente da stack
```

## Stack técnica

### Backend

- Node.js + TypeScript
- Express
- Prisma Client (consumo tipado do schema)
- Zod (validação de entrada e ambiente)
- Autenticação por token (JWT) com senhas em hash scrypt; autorização por cargo
- helmet (cabeçalhos de segurança) e express-rate-limit (limite de requisições)

### Banco de dados

- PostgreSQL 16 (container)
- Scripts de inicialização: `database/init/001_schema.sql` (schema) e
  `database/init/002_seed.sql` (dados iniciais)

> Observação importante: o schema SQL é a fonte de verdade. O arquivo `backend/prisma/schema.prisma` é mantido em espelho para geração do client, sem uso de migrations automáticas.

## Documentação já produzida

A pasta `docs/` concentra os artefatos da modelagem:

- `Análise de requisitos.md` — enunciado completo e regras de negócio;
- `01-mer-conceitual.md` — MER conceitual (entidades, cardinalidades e decisões);
- `02-der.dbml` — DER em DBML (cole em dbdiagram.io para gerar o diagrama);
- `03-dicionario-de-dados.md` — definição de atributos e significado de negócio;
- `04-modelo-logico.md` — tradução DER → relacional e verificação de 3FN;
- `05-justificativas-tecnicas.md` — justificativas formais de decisões de modelagem.

## Como executar com Docker Compose (recomendado)

### 1) Pré-requisitos

- Docker
- Docker Compose

### 2) Configuração

Na raiz, copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Preencha os valores obrigatórios (o próprio `.env.example` explica cada um):

| Variável | Para quê |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credenciais e nome do banco |
| `HOST_BACKEND_PORT`, `BACKEND_PORT` | Porta no servidor → porta no container |
| `CORS_ORIGIN` | Endereço(s) do frontend autorizados a chamar a API |
| `JWT_SECRET` | Chave que assina os logins (mínimo de 32 caracteres, aleatória e secreta) |
| `ADMIN_LOGIN`, `ADMIN_SENHA` | Primeiro usuário (gerente), criado na primeira subida |

Para gerar um `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3) Subir os serviços

```bash
docker compose up --build
```

Serviços:

- `db` (PostgreSQL)
- `backend` (API)

O schema e os dados iniciais são criados automaticamente no primeiro start do
banco via `database/init/`. `docker compose ps` mostra o backend como
`healthy` quando a API está no ar **e** conversando com o banco.

> **Atualizando de uma versão anterior?** Os scripts de `database/init/` só
> rodam quando o volume do banco está vazio. Depois de uma mudança no schema
> é preciso recriar o volume — **isso apaga os dados**:
>
> ```bash
> docker compose down -v
> docker compose up --build
> ```

## Execução local do backend (sem Docker)

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Scripts disponíveis no backend:

- `npm run dev` — desenvolvimento com reload
- `npm run build` — build TypeScript
- `npm run start` — execução em produção
- `npm run typecheck` — validação de tipos
- `npm run test:e2e` — testes de ponta a ponta (ver abaixo)

## Testes automatizados

`backend/tests/e2e/` traz 60 testes que conversam com a API por HTTP, como o
frontend fará, contra um PostgreSQL de verdade — exercitam de uma vez rotas,
validações, regras de negócio, triggers e constraints do banco:

| Arquivo | O que verifica |
| --- | --- |
| `seguranca.test.ts` | login, tokens forjados, permissões por cargo, bloqueio de tentativas, entradas malformadas |
| `cadastros.test.ts` | paginação, validações, produto × combo, desativação, cargos e vínculos, promoções |
| `pedidos.test.ts` | registro, preço congelado, status, entrega, pagamentos, estorno, relatórios |
| `concorrencia.test.ts` | 10 requisições simultâneas iguais: só uma pode ter efeito |

Com a API no ar (local ou no Docker) e o banco criado pelos scripts de
`database/init/`:

```bash
cd backend
npm run test:e2e
```

Por padrão os testes usam `http://localhost:3000` e o gerente
`admin` / `admin12345` (os valores de `backend/.env.example`). Para outro
ambiente: `API_URL=http://localhost:8080 ADMIN_LOGIN=... ADMIN_SENHA=... npm run test:e2e`.
Cada teste cria os próprios dados, então a suíte pode rodar várias vezes no
mesmo banco — mas ela faz ~500 requisições: para repetir em seguida, use
`LIMITE_REQUISICOES_POR_MINUTO=0` na API.

## Status atual do desenvolvimento

- ✅ Modelagem de dados e documentação técnica consolidadas;
- ✅ Schema relacional implementado em SQL;
- ✅ Backend completo: todos os cadastros, pedido (itens, adicionais,
  pagamentos, entrega, avaliação, histórico de status) e relatórios;
- ✅ Autenticação, autorização por cargo e testes automatizados;
- 🚧 Frontend ainda em estrutura inicial (pastas base criadas).

## Autenticação e permissões

Toda a API exige login, exceto `GET /health` e `POST /auth/login`.

```bash
# 1. Entrar
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "admin", "senha": "admin12345"}'
# -> { "token": "eyJ...", "tipo": "Bearer", "expiraEm": "...",
#      "funcionario": { "id": 1, "nome": "Administrador", "cargos": ["gerente"] } }

# 2. Enviar o token em todas as outras chamadas
curl http://localhost:3000/produtos -H "Authorization: Bearer eyJ..."
```

- **Quem tem acesso:** funcionários com `login` e `senha` cadastrados (o
  gerente define isso em `/funcionarios`). O primeiro gerente vem de
  `ADMIN_LOGIN` / `ADMIN_SENHA`.
- **O que cada um pode:** depende dos **cargos que exerce hoje**
  (`/funcionarios/:id/cargos`), relidos a cada requisição — desativar alguém
  ou encerrar um cargo vale na hora.

| Ação | Quem pode |
| --- | --- |
| Consultar qualquer cadastro (`GET`) | qualquer funcionário logado |
| Registrar e operar pedidos; cadastrar e editar clientes | qualquer funcionário logado |
| Criar, alterar ou remover cadastros (cardápio, estoque, equipe, mesas, cupons...) | gerente |
| Relatórios | gerente |

Respostas de erro de acesso: `401` (sem login, token inválido ou expirado),
`403` (logado, mas sem o cargo necessário), `429` (muitas requisições).

## Endpoints do backend

Salvo indicação, cada recurso tem o CRUD padrão: `POST /`, `GET /`,
`GET /:id`, `PATCH /:id`, `DELETE /:id`.

**Listagens são paginadas** (`?pagina=1&tamanhoPagina=20`, máximo de 100 por
página) e respondem sempre no mesmo formato:

```json
{ "dados": [ ... ], "paginacao": { "pagina": 1, "tamanhoPagina": 20, "total": 57, "totalPaginas": 3 } }
```

As sub-listas (variações, ficha técnica, cargos de um funcionário) são
pequenas por natureza e voltam como lista simples.

| Área | Recurso | Observações |
| --- | --- | --- |
| — | `GET /health` | Público. `200` se a API e o banco respondem; `503` se o banco está fora |
| Acesso | `/auth` | `POST /login`, `GET /me` (quem sou eu e meus cargos), `PATCH /senha` (trocar a própria senha) |
| Cadastros | `/clientes` | `?busca=` (nome, telefone ou e-mail); `GET /clientes/:id/pedidos` — histórico de pedidos do cliente |
| Cadastros | `/funcionarios` | Filtros `?ativo=` e `?cargo=entregador`; aceita `login`/`senha` (`login: null` remove o acesso). Sub-rota `/funcionarios/:funcionarioId/cargos`: `POST` abre vínculo, `GET` histórico, `PATCH /:vinculoId` encerra |
| Cadastros | `/cargos`, `/mesas`, `/formas-pagamento` | `/mesas?ativa=`. Os quatro cargos-base não podem ser alterados |
| Cardápio | `/categorias`, `/adicionais` | `/adicionais?ativo=` |
| Cardápio | `/produtos` | Filtros `?ativo=` e `?categoriaId=`. Sub-rotas `/produtos/:produtoId/variacoes` (`POST`, `GET`, `PATCH /:variacaoId`, `DELETE /:variacaoId`) e `/produtos/:produtoId/ingredientes` — ficha técnica (`GET`, `PUT /:ingredienteId`, `DELETE /:ingredienteId`) |
| Cardápio | `/combos` | Corpo traz `itens: [{ produtoId, quantidade }]` (mínimo de 2 produtos); `?ativo=` |
| Cardápio | `/promocoes` | Corpo traz `produtoIds`; `GET /promocoes?ativaEm=AAAA-MM-DD` |
| Cardápio | `/cupons` | Código normalizado em maiúsculas |
| Estoque | `/fornecedores`, `/ingredientes` | `/ingredientes?fornecedorId=` |
| Operação | `/pedidos` | `POST /`, `GET /` (filtros `status`, `clienteId`, `dataInicio`, `dataFim`), `GET /:id`, `POST /:id/status`, `POST /:id/pagamentos`, `PATCH /:id/entrega` (define o entregador), `POST /:id/avaliacao` |
| Operação | `/relatorios` | `GET /mais-vendidos`, `GET /consumo-ingredientes`, `GET /vendas-por-atendente` — todos com `?dataInicio=AAAA-MM-DD&dataFim=AAAA-MM-DD` |

### Exemplo: registrar um pedido

```json
POST /pedidos
{
  "canal": "APP",
  "clienteId": 1,
  "cupomCodigo": "BEMVINDO10",
  "itens": [
    { "itemVendavelId": 1, "quantidade": 2, "variacaoId": 1,
      "adicionalIds": [1, 2], "observacao": "sem cebola" },
    { "itemVendavelId": 4, "quantidade": 1 }
  ],
  "entrega": { "taxaEntrega": 7.5 },
  "pagamentos": [
    { "formaPagamentoId": 1, "valorPago": 30 },
    { "formaPagamentoId": 2, "valorPago": 25 }
  ]
}
```

O atendente é o funcionário logado (ou `atendenteId`, para lançar em nome de
outro atendente). O entregador pode vir já em `entrega.entregadorId` ou ser
definido depois, com `PATCH /pedidos/:id/entrega`.

A resposta traz o pedido montado, com `statusAtual`, `statusHistorico` e o
bloco `totais` (`subtotalItens`, `descontoCupom`, `taxaEntrega`, `total`,
`totalPago`, `totalEstornado`, `saldo`).

## Regras de negócio implementadas no backend

- **Quem precisa de cadastro**: pedido pelo `APP`, com entrega ou com cupom
  exige `clienteId`; pedido de balcão pode ser anônimo. Mesa e entrega não
  podem vir juntas, e a mesa precisa estar ativa.
- **Preço congelado**: cada item grava o preço praticado na hora da venda —
  preço-base do produto com a melhor promoção vigente no dia (promoções não
  acumulam), mais o acréscimo da variação. Combo usa o próprio preço.
  Adicionais são cobrados por unidade do item.
- **Cupom**: precisa estar na validade, vale uma vez por cliente e incide
  sobre os itens (não sobre a taxa de entrega). Depois de usado, o tipo e o
  valor do desconto não podem mais ser alterados. Pedido cancelado devolve o
  cupom ao cliente.
- **Status**: `RECEBIDO → EM_PREPARO → PRONTO → ENTREGUE_RETIRADO`, com
  `SAIU_PARA_ENTREGA` obrigatório entre `PRONTO` e a entrega quando o pedido
  é de delivery; `CANCELADO` a partir de qualquer status não final. Cada
  mudança é uma nova linha no histórico, com horário; o histórico não pode
  ser alterado, e o status atual é derivado dele pelo próprio banco.
- **Atendente e entregador**: precisam estar ativos e exercer hoje o cargo
  correspondente (`atendente` / `entregador`).
- **Pagamento**: várias formas por pedido; a soma nunca passa do total.
  Cancelar um pedido já pago **estorna** os pagamentos: eles continuam
  registrados (com a data do estorno), mas deixam de contar como valor pago.
- **Entrega**: endereço congelado no pedido (se omitido, copia o endereço
  padrão do cliente). O entregador pode ser definido ou trocado até o pedido
  sair, e é obrigatório para ele sair.
- **Avaliação**: uma por pedido, só depois de entregue ou retirado.
- **Promoção**: a que já esteve em vigor em algum dia anterior é histórico —
  não pode ser apagada nem ter desconto, início ou produtos alterados; só o
  nome e a `dataFim` (para encerrar ou prorrogar).
- **Desativar em vez de apagar**: produto, combo ou adicional já vendido e
  funcionário com histórico não podem ser removidos; `ativo = false` os tira
  de circulação preservando os pedidos antigos. Item desativado (ou combo
  com componente desativado) não entra em pedido novo.
- **Cargos**: um vínculo encerrado não é "encerrado de novo"; apagar um
  funcionário não apaga o histórico de cargos; um gerente não remove o
  próprio acesso (o sistema nunca fica sem gerente).
- **Estoque**: o consumo de ingredientes é estimado em relatório a partir da
  ficha técnica; a venda não baixa o estoque automaticamente.
- **Datas**: "hoje" segue o fuso do negócio (`APP_TIMEZONE`, padrão
  `America/Sao_Paulo`), não o do servidor.

## Segurança e operação

- **Senhas**: guardadas como hash scrypt (com sal por senha); o hash nunca
  sai em nenhuma resposta da API.
- **Sessão**: token JWT assinado com `JWT_SECRET`, válido por um turno
  (`JWT_EXPIRA_EM_HORAS`, padrão 8). Trocar a senha invalida os tokens
  antigos.
- **Limites**: 600 requisições por minuto por IP e 10 tentativas de login
  erradas por login a cada 15 minutos (ajustáveis por variável de ambiente).
- **Logs**: uma linha JSON por requisição (`docker compose logs backend`),
  com um id que também volta no cabeçalho `X-Request-Id` e no corpo dos erros
  500 — sem corpo de requisição, senha ou token.
- **Container**: a imagem do backend roda como usuário sem privilégios e não
  leva ferramentas de build.

Limitações conhecidas (aceitáveis para o servidor local da sala): o tráfego é
HTTP, sem criptografia — em uma rede não confiável seria preciso HTTPS na
frente da API; e o contador de limite de requisições fica na memória de um
único container.

## Próximos incrementos sugeridos

- adicionar frontend para fluxo completo de pedidos (tela de login, guardar
  o token e enviá-lo no cabeçalho `Authorization`);
- incluir o frontend no `docker-compose.yml`.
