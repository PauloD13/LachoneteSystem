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
- ✅ Backend com base estrutural e módulo de clientes (CRUD + validação);
- 🚧 Frontend ainda em estrutura inicial (pastas base criadas).

## Endpoints já disponíveis (backend)

- `GET /health`
- `POST /clientes`
- `GET /clientes`
- `GET /clientes/:id`
- `PATCH /clientes/:id`
- `DELETE /clientes/:id`

## Próximos incrementos sugeridos

- implementar módulos de produtos, pedidos, pagamentos e status;
- adicionar frontend para fluxo completo de pedidos;
- criar testes automatizados de API;
- ampliar documentação operacional (ex.: exemplos de payload e fluxo de uso).
