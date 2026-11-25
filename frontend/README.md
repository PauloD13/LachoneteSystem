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

## Estrutura

```text
src/
├── main.tsx             # ponto de entrada: Router + AuthProvider + App
├── App.tsx
├── index.css            # importa styles/ (CSS global)
├── styles/
│   ├── tokens.css       # cores, espaçamentos, fontes — o "tema"
│   └── base.css         # reset e estilo padrão dos elementos HTML
├── routes/              # mapa de telas e proteção por login/cargo
├── pages/               # uma tela por arquivo (+ seu .module.css)
├── components/          # peças reutilizadas entre telas
├── services/            # TODA conversa com a API
├── hooks/               # useAuth, useConsulta
├── contexts/            # estado global (só o login)
├── lib/                 # formatadores e rótulos
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

**CSS próprio.** Global só em `styles/`; cada tela tem seu
`Tela.module.css`. Toda cor e espaçamento vêm das variáveis de
`styles/tokens.css` — para aplicar a identidade visual do protótipo, muda-se
os valores ali.

**HTML semântico.** `<header>`, `<nav>`, `<main>`, `<section>`, `<form>` com
`<label htmlFor>` em todo campo, `<table>` para dados tabulares, mensagens de
erro com `role="alert"`.

## Adicionando uma tela

1. Crie `src/pages/NomeDaTelaPage.tsx` (e `NomeDaTelaPage.module.css`).
2. Registre a rota em `src/routes/AppRoutes.tsx`, no grupo de permissão
   certo.
3. Adicione o link no menu (`src/components/LayoutPrincipal.tsx`).

As telas de login e início atuais são **provisórias**, só para o ambiente
funcionar de ponta a ponta; serão refeitas conforme o protótipo.
