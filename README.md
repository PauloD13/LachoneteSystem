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
├── database/
│   └── init/001_schema.sql # Schema SQL (fonte da verdade do banco)
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

### Banco de dados

- PostgreSQL 16 (container)
- Script principal: `database/init/001_schema.sql`

> Observação importante: o schema SQL é a fonte de verdade. O arquivo `backend/prisma/schema.prisma` é mantido em espelho para geração do client, sem uso de migrations automáticas.

## Documentação já produzida

A pasta `docs/` concentra os artefatos da modelagem:

- `Análise de requisitos.md` — enunciado completo e regras de negócio;
- `01-mer-conceitual.md` — MER conceitual (entidades, cardinalidades e decisões);
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

Preencha os valores obrigatórios:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `HOST_BACKEND_PORT`
- `BACKEND_PORT`
- `CORS_ORIGIN`

### 3) Subir os serviços

```bash
docker compose up --build
```

Serviços:

- `db` (PostgreSQL)
- `backend` (API)

O schema é criado automaticamente no primeiro start do banco via `database/init/`.

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

## Status atual do desenvolvimento

- ✅ Modelagem de dados e documentação técnica consolidadas;
- ✅ Schema relacional implementado em SQL;
- ✅ Backend completo: todos os cadastros, pedido (itens, adicionais,
  pagamentos, entrega, avaliação, histórico de status) e relatórios;
- 🚧 Frontend ainda em estrutura inicial (pastas base criadas).

## Endpoints do backend

Salvo indicação, cada recurso tem o CRUD padrão: `POST /`, `GET /`,
`GET /:id`, `PATCH /:id`, `DELETE /:id`.

| Área | Recurso | Observações |
| --- | --- | --- |
| — | `GET /health` | Verificação de disponibilidade |
| Cadastros | `/clientes` | `GET /clientes/:id/pedidos` — histórico de pedidos do cliente |
| Cadastros | `/funcionarios` | Sub-rota `/funcionarios/:funcionarioId/cargos`: `POST` abre vínculo, `GET` histórico, `PATCH /:vinculoId` encerra |
| Cadastros | `/cargos`, `/mesas`, `/formas-pagamento` | |
| Cardápio | `/categorias`, `/adicionais` | |
| Cardápio | `/produtos` | Sub-rotas `/produtos/:produtoId/variacoes` (`POST`, `GET`, `PATCH /:variacaoId`, `DELETE /:variacaoId`) e `/produtos/:produtoId/ingredientes` — ficha técnica (`GET`, `PUT /:ingredienteId`, `DELETE /:ingredienteId`) |
| Cardápio | `/combos` | Corpo traz `itens: [{ produtoId, quantidade }]` (mínimo de 2 produtos) |
| Cardápio | `/promocoes` | Corpo traz `produtoIds`; `GET /promocoes?ativaEm=AAAA-MM-DD` |
| Cardápio | `/cupons` | Código normalizado em maiúsculas |
| Estoque | `/fornecedores`, `/ingredientes` | |
| Operação | `/pedidos` | `POST /`, `GET /` (paginado; filtros `status`, `clienteId`, `dataInicio`, `dataFim`), `GET /:id`, `POST /:id/status`, `POST /:id/pagamentos`, `PATCH /:id/entrega`, `POST /:id/avaliacao` |
| Operação | `/relatorios` | `GET /mais-vendidos`, `GET /consumo-ingredientes`, `GET /vendas-por-atendente` — todos com `?dataInicio=AAAA-MM-DD&dataFim=AAAA-MM-DD` |

### Exemplo: registrar um pedido

```json
POST /pedidos
{
  "canal": "APP",
  "clienteId": 1,
  "atendenteId": 1,
  "cupomCodigo": "BEMVINDO10",
  "itens": [
    { "itemVendavelId": 1, "quantidade": 2, "variacaoId": 1,
      "adicionalIds": [1, 2], "observacao": "sem cebola" },
    { "itemVendavelId": 4, "quantidade": 1 }
  ],
  "entrega": { "entregadorId": 2, "taxaEntrega": 7.5 },
  "pagamentos": [
    { "formaPagamentoId": 1, "valorPago": 30 },
    { "formaPagamentoId": 2, "valorPago": 25 }
  ]
}
```

A resposta traz o pedido montado, com `statusAtual`, `statusHistorico` e o
bloco `totais` (`subtotalItens`, `descontoCupom`, `taxaEntrega`, `total`,
`totalPago`, `saldo`).

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
  mudança é uma nova linha no histórico, com horário.
- **Pagamento**: várias formas por pedido; a soma nunca passa do total.
- **Entrega**: endereço congelado no pedido (se omitido, copia o endereço
  padrão do cliente); o entregador pode ser trocado até o pedido sair.
- **Avaliação**: uma por pedido, só depois de entregue ou retirado.
- **Promoção**: a que já esteve em vigor não pode ser apagada (faz parte do
  histórico) — encerra-se pela `dataFim`.
- **Estoque**: o consumo de ingredientes é estimado em relatório a partir da
  ficha técnica; a venda não baixa o estoque automaticamente.
- **Datas**: "hoje" segue o fuso do negócio (`APP_TIMEZONE`, padrão
  `America/Sao_Paulo`), não o do servidor.

## Próximos incrementos sugeridos

- adicionar frontend para fluxo completo de pedidos;
- incluir o frontend no `docker-compose.yml`;
- criar testes automatizados de API.
