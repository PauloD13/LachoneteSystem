# Frontend — Lanchonete Sabor & Cia

Interface web em **React 19 + TypeScript**, empacotada com **Vite** e
navegação com **React Router 8**. Consome a API do backend por `fetch`.

## Rodando

Pré-requisito: Node **22.22 ou mais novo** (`node -v`) e o backend rodando na
porta 3000 (ver README da raiz).

```bash
npm install
npm run dev        # http://localhost:5173
```

Em desenvolvimento, o Vite repassa ao backend tudo o que começa com `/api`
(proxy em `vite.config.ts`). Por isso o frontend chama sempre `/api/...`,
sem endereço fixo — no deploy, o próprio backend serve estas telas e a regra
continua valendo.

Login inicial: `admin` / `admin12345` (os valores de `backend/.env.example`).

| Script              | O que faz                                                |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento (recarrega a cada alteração) |
| `npm run build`     | Confere os tipos e gera os arquivos finais em `dist/`    |
| `npm run typecheck` | Só a conferência de tipos                                |
| `npm run lint`      | ESLint: aponta erros prováveis                           |
| `npm run format`    | Prettier: formata todo o código                          |
| `npm test`          | Testes unitários (Vitest)                                |

## Telas

O visual segue o design system **Sabor & Cia** (`styles/tokens.css` e
`styles/bundle.css`, classes `sc-*`). Cada pessoa cai na tela do seu cargo ao
entrar (gerente → atendente → cozinheiro → entregador, nessa prioridade).

| Rota                                    | Tela                                        | Quem       |
| --------------------------------------- | ------------------------------------------- | ---------- |
| `/login`                                | Login                                       | todos      |
| `/inicio`                               | Início do turno                             | atendente  |
| `/pedidos/novo`                         | Novo pedido (+ folha do item)               | atendente  |
| `/pedidos/novo/fechar`                  | Fechamento                                  | atendente  |
| `/pedidos`, `/pedidos/:id`              | Lista e detalhe do pedido                   | todos      |
| `/mesas`                                | Mesas (livres abrem pedido)                 | atendente  |
| `/mais`, `/perfil`                      | Atalhos, tema, trocar senha, sair           | todos      |
| `/clientes`                             | Clientes                                    | atendente  |
| `/cozinha`                              | Cozinha (tablet, atualiza a cada 10 s)      | cozinheiro |
| `/entregas`, `/entregas/historico`      | Minhas entregas e histórico                 | entregador |
| `/gerencia/pedidos`                     | Pedidos (desktop)                           | gerente    |
| `/gerencia/clientes`                    | Clientes com ficha e histórico              | gerente    |
| `/gerencia/cardapio`                    | Produtos, combos, categorias, adicionais... | gerente    |
| `/gerencia/estoque`                     | Ingredientes e fornecedores                 | gerente    |
| `/gerencia/relatorios`                  | Mais vendidos, vendas, consumo              | gerente    |
| `/gerencia/equipe`, `/gerencia/ajustes` | Funcionários e cargos; mesas, formas...     | gerente    |

## Estrutura

```text
src/
├── main.tsx             # ponto de entrada: Router + Avisos + Auth + App
├── App.tsx              # carrinho (pedido em montagem) + rotas
├── index.css            # importa styles/ (CSS global)
├── styles/
│   ├── tokens.css       # design system: cores (claro/escuro), espaço, fontes
│   ├── bundle.css       # design system: componentes sc-* e movimento
│   ├── base.css         # reset dos elementos HTML
│   └── app.css          # padrões das telas (cartão, segmentado, folha...)
├── routes/              # mapa de telas e proteção por login/cargo
├── pages/               # uma tela por arquivo, por área:
│   ├── atendente/  cozinha/  entregador/  gerencia/  conta/
├── components/
│   ├── ui/              # Botao, Campo, Chip, Segmentado, Folha, Abas...
│   ├── layout/          # LayoutCelular (nav inferior), LayoutGerencia
│   ├── pedido/          # folhas do item/cliente/mesa, cartão do pedido
│   └── conta/           # tema e troca de senha
├── services/            # TODA conversa com a API
├── hooks/               # useAuth, useConsulta, useAcao, useAvisos...
├── contexts/            # login, avisos (toasts) e carrinho
├── lib/                 # formatadores, status, montagem do pedido...
└── types/               # tipos das respostas da API
```

## Convenções

**Falar com a API: sempre por `services/`.** Nenhuma tela chama `fetch`
direto. Cada recurso já tem seu serviço tipado:

```ts
import { clientes, produtos } from "../services/cadastros";
import { pedidos } from "../services/pedidos";

const pagina = await clientes.listar({ busca: "ana", pagina: 2 });
await produtos.atualizar(7, { ativo: false });
await pedidos.mudarStatus(12, "EM_PREPARO");
```

Erros chegam como `ErroDaApi`, com a mensagem pronta para a tela
(`mensagemDeErro(erro)`) e os erros de validação por campo
(`erro.doCampo("nome")`). Um 401 no meio do uso desloga e volta ao login
automaticamente.

**Carregar dados numa tela: `useConsulta`.** Cuida de "carregando", erro e
cancelamento ao trocar de página ou de filtro:

```ts
const { dados, carregando, erro, recarregar } = useConsulta(
  `clientes:${pagina}:${busca}`,
  (sinal) => clientes.listar({ pagina, busca }, sinal),
);
```

**Exibir valores: `lib/formatadores.ts`.** Dois cuidados que a API exige:

- dinheiro chega como **texto** (`"27.50"`): exiba com `moeda()` e faça
  conta com `paraNumero()`;
- datas de calendário (validade de promoção, início de cargo) chegam como
  meia-noite UTC. `new Date(...).toLocaleDateString()` mostraria o **dia
  anterior** no Brasil; use `dia()`.

**Permissões: `useAuth().temCargo("gerente")`** para esconder botões e
`<ExigeCargo>` nas rotas. É conforto visual — quem garante a regra é o
backend (responde 403).

**CSS.** Componentes do design system pelas classes `sc-*` (ou pelos
wrappers em `components/ui`); padrões de tela pelas classes `ui-*` de
`styles/app.css`; o que é só de uma tela, no `.module.css` dela. Toda cor,
espaço e raio vêm das variáveis de `styles/tokens.css` — nada de cor nova
fora dali. O tema (claro/escuro/do aparelho) fica em `lib/tema.ts`.

**Avisos e ações.** `useAvisos().sucesso("Salvo")` / `.erro(erro)` mostram
os toasts; `useAcao()` junta "ocupado", aviso e erros por campo para os
botões de salvar/excluir.

**Status do pedido: `lib/status.ts`.** Cor (selo e listra), rótulo e a
próxima ação de cada status ficam num lugar só.

**Pedido em montagem: `useCarrinho()`.** Novo pedido, item e fechamento
compartilham o carrinho (guardado na aba, sobrevive a recarregar). O
fechamento pergunta o total ao backend (`POST /pedidos/simulacao`) a cada
mudança, então o que a tela mostra é exatamente o que será cobrado.

**HTML semântico.** `<header>`, `<nav>`, `<main>`, `<section>`, `<form>` com
`<label htmlFor>` em todo campo, `<table>` para dados tabulares, mensagens de
erro com `role="alert"`.

## Adicionando uma tela

1. Crie `src/pages/<area>/NomeDaTelaPage.tsx`.
2. Registre a rota em `src/routes/AppRoutes.tsx`, dentro do layout e do
   grupo de permissão certos.
3. Adicione o link na navegação (`components/layout/LayoutCelular.tsx` ou
   `LayoutGerencia.tsx`).
