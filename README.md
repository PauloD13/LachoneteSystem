# LanchoneteSystem

[![CI](https://github.com/PauloD13/LachoneteSystem/actions/workflows/ci.yml/badge.svg)](https://github.com/PauloD13/LachoneteSystem/actions/workflows/ci.yml)

Sistema acadêmico de gestão para a **Lanchonete Sabor & Cia**, desenvolvido para aplicar modelagem de banco de dados (MER/DER/3FN) e implementação fullstack com deploy em Docker Compose.

## Contexto do projeto

Este repositório implementa a situação de aprendizagem descrita em `docs/Análise de requisitos.md`: transformar regras de negócio reais de uma lanchonete em:

- modelo conceitual (MER);
- modelo lógico relacional normalizado;
- documentação técnica de apoio;
- backend conectado a PostgreSQL;
- frontend web (base pronta; telas em construção a partir do protótipo).

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
├── .github/                # CI (GitHub Actions), Dependabot e modelo de PR
├── backend/                # API Node.js + TypeScript + Express + Prisma Client
│   └── tests/e2e/          # Testes automatizados de ponta a ponta
├── database/
│   └── init/
│       ├── 001_schema.sql  # Schema SQL (fonte da verdade do banco)
│       └── 002_seed.sql    # Dados iniciais: cargos, formas de pagamento, categorias
├── docs/                   # Artefatos de modelagem e justificativas
├── frontend/               # Telas: React + TypeScript + Vite (ver frontend/README.md)
├── scripts/                # Scripts utilitários de estrutura
├── docker-compose.yml      # Orquestra backend (API + telas) + PostgreSQL
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

### Frontend

- React 19 + TypeScript, empacotado com Vite
- React Router (navegação entre telas)
- CSS próprio (CSS Modules + variáveis de tema), sem framework de UI
- `fetch` nativo para consumir a API
- Detalhes, estrutura e convenções em `frontend/README.md`

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

| Variável                                            | Para quê                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credenciais e nome do banco                                               |
| `HOST_BACKEND_PORT`, `BACKEND_PORT`                 | Porta no servidor → porta no container                                    |
| `JWT_SECRET`                                        | Chave que assina os logins (mínimo de 32 caracteres, aleatória e secreta) |
| `ADMIN_LOGIN`, `ADMIN_SENHA`                        | Primeiro usuário (gerente), criado na primeira subida                     |

Para gerar um `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3) Subir os serviços

```bash
docker compose up --build
```

Serviços:

- `db` (PostgreSQL) — sem porta exposta: só o backend o acessa, pela rede
  interna do Compose;
- `backend` — a API **e as telas**, no mesmo endereço. O Dockerfile compila
  o frontend e o Express o serve.

Depois de subir, o sistema fica em `http://<ip-do-servidor>:HOST_BACKEND_PORT`
(no próprio servidor, `http://localhost:HOST_BACKEND_PORT`). A API responde
no mesmo endereço, sob `/api`.

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

## Execução local para desenvolvimento (sem Docker)

Útil no desenvolvimento: o backend roda na sua máquina com `npm run dev`
(recarrega a cada alteração) e só o banco fica num container.

**1. Suba um PostgreSQL** com o schema e os dados iniciais. O banco do
`docker-compose.yml` não serve para isso: de propósito, a porta dele não é
publicada (só o backend do compose o acessa, pela rede interna). Na **raiz**
do projeto:

```bash
# Linux / macOS / Git Bash
docker run -d --name lachonete-db -p 5432:5432 \
  -e POSTGRES_USER=lachonete -e POSTGRES_PASSWORD=lachonete -e POSTGRES_DB=lachonete \
  -v "$(pwd)/database/init:/docker-entrypoint-initdb.d:ro" postgres:16-alpine
```

```bat
:: Windows (Prompt de Comando)
docker run -d --name lachonete-db -p 5432:5432 -e POSTGRES_USER=lachonete -e POSTGRES_PASSWORD=lachonete -e POSTGRES_DB=lachonete -v "%cd%\database\init:/docker-entrypoint-initdb.d:ro" postgres:16-alpine
```

As credenciais (`lachonete`/`lachonete`) são as mesmas do
`backend/.env.example`. Nos dias seguintes basta `docker start lachonete-db`.
Para recomeçar do zero (por exemplo, depois de uma mudança em
`database/init/`): `docker rm -f -v lachonete-db` e o `docker run` de novo.

> Se a porta 5432 já estiver ocupada (um PostgreSQL instalado na máquina),
> troque para `-p 5433:5432` e use `localhost:5433` na `DATABASE_URL`.

**2. Rode o backend:**

```bash
cd backend
cp .env.example .env      # Windows: copy .env.example .env
npm install
npm run dev
```

O `.env.example` já vem pronto para esse banco. Na primeira subida o backend
cria o gerente inicial (`admin` / `admin12345`). Confira em
`http://localhost:3000/api/health`.

**3. Rode o frontend**, em outro terminal:

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

O Vite repassa ao backend (porta 3000) tudo o que começa com `/api`, então
basta abrir `http://localhost:5173` e entrar com `admin` / `admin12345`.

Scripts disponíveis no backend:

- `npm run dev` — desenvolvimento com reload
- `npm run build` — build TypeScript
- `npm run start` — execução em produção
- `npm run typecheck` — validação de tipos
- `npm run test:e2e` — testes de ponta a ponta (ver abaixo)
- `npm run lint` / `npm run format` — ver "Qualidade de código e CI"

## Testes automatizados

`backend/tests/e2e/` traz 76 testes que conversam com a API por HTTP, como o
frontend fará, contra um PostgreSQL de verdade — exercitam de uma vez rotas,
validações, regras de negócio, triggers e constraints do banco:

| Arquivo                | O que verifica                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `seguranca.test.ts`    | login, tokens forjados, permissões por cargo, bloqueio de tentativas, entradas malformadas    |
| `cadastros.test.ts`    | paginação, validações, produto × combo, desativação, cargos e vínculos, promoções             |
| `pedidos.test.ts`      | registro, preço congelado, status, entrega, pagamentos, estorno, relatórios                   |
| `concorrencia.test.ts` | 10 requisições simultâneas iguais: só uma pode ter efeito                                     |
| `estoque.test.ts`      | estoque mínimo, filtro de reposição e baixa automática pela ficha técnica                     |
| `eventos.test.ts`      | tempo real: o fluxo de eventos exige login e avisa pedido criado e mudança de status          |
| `fotos.test.ts`        | foto do produto: envio pelo gerente, leitura pública, só imagem de verdade, limite de tamanho |

Com a API no ar (local ou no Docker) e o banco criado pelos scripts de
`database/init/`:

```bash
cd backend
npm run test:e2e
```

Por padrão os testes usam `http://localhost:3000/api` e o gerente
`admin` / `admin12345` (os valores de `backend/.env.example`). Para outro
ambiente: `API_URL=http://localhost:8080/api ADMIN_LOGIN=... ADMIN_SENHA=... npm run test:e2e`.
Cada teste cria os próprios dados, então a suíte pode rodar várias vezes no
mesmo banco — mas ela faz ~500 requisições: para repetir em seguida, use
`LIMITE_REQUISICOES_POR_MINUTO=0` na API.

## Qualidade de código e CI

As duas pastas (`backend/` e `frontend/`) têm os mesmos comandos:

| Comando                         | O que faz                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `npm run format`                | **Prettier**: formata o código (aspas, espaços, quebras de linha) no padrão do projeto |
| `npm run format:check`          | Só confere, sem alterar (é o que o CI roda)                                            |
| `npm run lint`                  | **ESLint**: aponta erros prováveis (variável não usada, `any`, regras do React)        |
| `npm test` / `npm run test:e2e` | Testes do frontend (Vitest) / da API (ponta a ponta)                                   |

Dica: rode `npm run format` antes de cada commit e o CI nunca vai reclamar de
formatação. Os arquivos `.editorconfig` e `.gitattributes` deixam indentação e
fim de linha iguais em todas as máquinas (inclusive no Windows).

**Comentários no código.** O código diz _o que_ faz; o comentário existe para
o que ele não consegue dizer sozinho:

- **o porquê** de uma decisão que pareceria estranha (`hsts: false` porque o
  deploy da sala é HTTP; a ficha técnica aceita um ingrediente só uma vez);
- **a regra do enunciado** que a linha implementa (ex.: "Regra 4.1");
- **a armadilha** que alguém cairia ao mexer (o fuso em datas, `Decimal` em
  dinheiro);
- **um resumo de uma linha** (`/** ... */`) em funções, hooks e componentes
  exportados, que o editor mostra ao passar o mouse.

Não comentar o que o nome já diz (`// Schema de criação (POST)` acima de
`criarProdutoSchema`), nem narrar passos (`// 4. Valida e reporta o erro`),
nem deixar histórico ("na etapa F8…"): o histórico fica no git. Comentário
desatualizado é pior que nenhum, então ele muda junto com o código.

**GitHub Actions** (`.github/workflows/ci.yml`) roda a cada push, em qualquer
branch, e mostra ✔ ou ✖ ao lado do commit:

| Job            | O que confere                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend        | formatação, lint, compilação, e os 76 testes da API contra um PostgreSQL criado pelos scripts de `database/init/`                                                                |
| Frontend       | formatação, lint, testes unitários e build                                                                                                                                       |
| Docker Compose | `docker compose up` do zero (com senha de banco cheia de caracteres especiais), espera ficar `healthy`, confere que as telas são servidas e roda os 76 testes contra o container |

Quando um passo falha, a aba **Actions** mostra qual e por quê; o comando do
passo é o mesmo que você roda localmente.

**Dependabot** (`.github/dependabot.yml`) abre PRs semanais com as
atualizações das dependências (pequenas agrupadas; versões major em PR
separado). O CI roda nesses PRs: se ficar verde, é revisar e mesclar.

**Modelo de PR** (`.github/pull_request_template.md`): todo PR novo já vem
com as seções e a lista de conferência.

## Status atual do desenvolvimento

- ✅ Modelagem de dados e documentação técnica consolidadas;
- ✅ Schema relacional implementado em SQL;
- ✅ Backend completo: todos os cadastros, pedido (itens, adicionais,
  pagamentos, entrega, avaliação, histórico de status) e relatórios;
- ✅ Autenticação, autorização por cargo e testes automatizados;
- ✅ Frontend com o design system Sabor & Cia (tema claro e escuro): as 14
  telas do protótipo (login, início, novo pedido, item, fechamento, pedidos,
  detalhe, cozinha, entregas, mesas, clientes, cardápio, estoque,
  relatórios) e as que faltavam (equipe, ajustes, histórico do entregador,
  perfil); servido pelo backend no Docker;
- ✅ CI no GitHub Actions (lint, formatação, testes, Docker Compose);

## Autenticação e permissões

Todas as rotas da API começam com **`/api`** (o restante dos endereços fica
para as telas do frontend). Toda a API exige login, exceto `GET /api/health`
e `POST /api/auth/login`.

```bash
# 1. Entrar
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "admin", "senha": "admin12345"}'
# -> { "token": "eyJ...", "tipo": "Bearer", "expiraEm": "...",
#      "funcionario": { "id": 1, "nome": "Administrador", "cargos": ["gerente"] } }

# 2. Enviar o token em todas as outras chamadas
curl http://localhost:3000/api/produtos -H "Authorization: Bearer eyJ..."
```

- **Quem tem acesso:** funcionários com `login` e `senha` cadastrados (o
  gerente define isso em `/funcionarios`). O primeiro gerente vem de
  `ADMIN_LOGIN` / `ADMIN_SENHA`.
- **O que cada um pode:** depende dos **cargos que exerce hoje**
  (`/funcionarios/:id/cargos`), relidos a cada requisição — desativar alguém
  ou encerrar um cargo vale na hora.

| Ação                                                                              | Quem pode                   |
| --------------------------------------------------------------------------------- | --------------------------- |
| Consultar qualquer cadastro (`GET`)                                               | qualquer funcionário logado |
| Registrar e operar pedidos; cadastrar e editar clientes                           | qualquer funcionário logado |
| Criar, alterar ou remover cadastros (cardápio, estoque, equipe, mesas, cupons...) | gerente                     |
| Relatórios                                                                        | gerente                     |

Respostas de erro de acesso: `401` (sem login, token inválido ou expirado),
`403` (logado, mas sem o cargo necessário), `429` (muitas requisições).

## Endpoints do backend

Todos os caminhos abaixo ficam sob `/api` (ex.: `/clientes` →
`http://localhost:3000/api/clientes`). Salvo indicação, cada recurso tem o
CRUD padrão: `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`.

**Listagens são paginadas** (`?pagina=1&tamanhoPagina=20`, máximo de 100 por
página) e respondem sempre no mesmo formato:

```json
{ "dados": [ ... ], "paginacao": { "pagina": 1, "tamanhoPagina": 20, "total": 57, "totalPaginas": 3 } }
```

As sub-listas (variações, ficha técnica, cargos de um funcionário) são
pequenas por natureza e voltam como lista simples.

| Área      | Recurso                                  | Observações                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —         | `GET /api/health`                        | Público. `200` se a API e o banco respondem; `503` se o banco está fora                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Acesso    | `/auth`                                  | `POST /login`, `GET /me` (quem sou eu e meus cargos), `PATCH /senha` (trocar a própria senha)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Cadastros | `/clientes`                              | `?busca=` (nome, telefone ou e-mail). Cada cliente da lista traz `totalPedidos` e `ultimoPedidoEm`; o detalhe traz `resumo` (`totalPedidos`, `totalGasto`, `ticketMedio`, `notaMedia`). `GET /clientes/:id/pedidos` — histórico de pedidos do cliente                                                                                                                                                                                                                                                                                                                                                     |
| Cadastros | `/funcionarios`                          | Filtros `?ativo=` e `?cargo=entregador`; aceita `login`/`senha` (`login: null` remove o acesso). Sub-rota `/funcionarios/:funcionarioId/cargos`: `POST` abre vínculo, `GET` histórico, `PATCH /:vinculoId` encerra                                                                                                                                                                                                                                                                                                                                                                                        |
| Cadastros | `/cargos`, `/mesas`, `/formas-pagamento` | `/mesas?ativa=`; cada mesa traz `pedidoAberto` (pedido de hoje ainda em andamento ou com saldo a pagar; `null` = livre). Os quatro cargos-base não podem ser alterados                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Cardápio  | `/categorias`                            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Cardápio  | `/adicionais`                            | Corpo traz `categoriaIds` (categorias em que é oferecido, mínimo 1; no `PATCH` substitui a lista). Filtros `?ativo=`, `?categoriaId=` e `?itemVendavelId=` (adicionais que cabem num produto ou combo)                                                                                                                                                                                                                                                                                                                                                                                                    |
| Cardápio  | `/produtos`                              | Filtros `?ativo=`, `?categoriaId=` e `?busca=`. Cada produto traz `precoVigente` (com a melhor promoção do dia), `promocaoVigente`, `totalVariacoes` e `fotoVersao`. Foto: `PUT /produtos/:id/foto` (gerente; o corpo é a imagem JPEG, PNG ou WebP, até 512 KB), `DELETE /produtos/:id/foto` e `GET /produtos/:id/foto?v=<fotoVersao>` (público: a tag `<img>` não envia o token). Sub-rotas `/produtos/:produtoId/variacoes` (`POST`, `GET`, `PATCH /:variacaoId`, `DELETE /:variacaoId`) e `/produtos/:produtoId/ingredientes` — ficha técnica (`GET`, `PUT /:ingredienteId`, `DELETE /:ingredienteId`) |
| Cardápio  | `/combos`                                | Corpo traz `itens: [{ produtoId, quantidade }]` (mínimo de 2 produtos); `?ativo=`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Cardápio  | `/promocoes`                             | Corpo traz `produtoIds`; `GET /promocoes?ativaEm=AAAA-MM-DD`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Cardápio  | `/cupons`                                | Código normalizado em maiúsculas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Estoque   | `/fornecedores`, `/ingredientes`         | `/ingredientes?fornecedorId=&busca=&ordem=nome\|estoque&repor=true` (estoque = menor primeiro; repor = no estoque mínimo ou abaixo); cada ingrediente traz `repor`, `usadoEm` (nº de produtos) e o detalhe, `produtos`. Fornecedores trazem `totalIngredientes` e `ingredientesPrevia`                                                                                                                                                                                                                                                                                                                    |
| Operação  | `/pedidos`                               | `POST /`, `POST /simulacao` (mesmo corpo; devolve itens precificados e totais sem gravar), `GET /` (filtros `status` — aceita vários, separados por vírgula —, `clienteId`, `mesaId`, `atendenteId`, `entregadorId`, `tipoAtendimento`, `busca` — número do pedido ou nome/telefone do cliente —, `dataInicio`, `dataFim`, `ordem=recentes\|antigos`), `GET /:id`, `POST /:id/status`, `POST /:id/pagamentos`, `PATCH /:id/entrega` (define o entregador), `POST /:id/avaliacao`                                                                                                                          |
| Operação  | `/relatorios`                            | `GET /mais-vendidos`, `GET /consumo-ingredientes`, `GET /vendas-por-atendente` — todos com `?dataInicio=AAAA-MM-DD&dataFim=AAAA-MM-DD`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Operação  | `/eventos`                               | `GET /` — Server-Sent Events: a conexão fica aberta e recebe `event: pedido` (`{ id, statusAtual }`) a cada pedido criado ou alterado. As telas da cozinha, de pedidos, de mesas e de entregas usam para atualizar na hora                                                                                                                                                                                                                                                                                                                                                                                |

### Exemplo: registrar um pedido

```json
POST /api/pedidos
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
definido depois, com `PATCH /api/pedidos/:id/entrega`.

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
  Adicionais são cobrados por unidade do item e só entram em itens das
  categorias em que são oferecidos (num combo, as categorias dos produtos
  dele).
- **Simulação**: `POST /pedidos/simulacao` aplica as mesmas regras do
  registro e devolve preços e totais sem gravar — é o que a tela de
  fechamento usa para mostrar o total e os erros antes de enviar.
- **Pagamento opcional no registro**: pode ser lançado depois
  (`POST /pedidos/:id/pagamentos`), por exemplo ao fim da refeição na mesa.
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
- **Estoque**: quando o pedido entra em preparo, o estoque de cada
  ingrediente baixa pela ficha técnica (produtos de combos contam; variações
  e adicionais não têm ficha). O estoque para em zero em vez de barrar a
  cozinha, e cancelar depois do preparo não devolve. Com `estoque_minimo`
  preenchido, o ingrediente no mínimo ou abaixo aparece para repor (filtro
  `?repor=true`, selo na tela e contador no menu da gerência).
- **Fotos**: guardadas no banco (tabela `produto_foto`), então o backup
  leva as fotos e o container não precisa de volume. A tela reduz a foto
  para no máximo 800 px antes de enviar; a API confere pelos primeiros bytes
  que é mesmo JPEG, PNG ou WebP.
- **Tempo real**: cada pedido criado ou alterado é avisado por
  `GET /api/eventos` (Server-Sent Events) a todas as telas abertas; a
  cozinha mostra "ao vivo" enquanto a conexão funciona. Sem ela (rede
  instável, servidor reiniciando), as telas voltam a consultar a API a cada
  10–30 s e reconectam sozinhas. O canal fica na memória do container: com
  várias réplicas do backend seria preciso um canal compartilhado.
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

- histórico de entradas e saídas do estoque (hoje a baixa e a reposição
  mudam só o saldo);
- impressão da comanda da cozinha e do cupom do cliente;
- canal de eventos compartilhado (LISTEN/NOTIFY do Postgres) se o backend
  passar a rodar em mais de um container.
