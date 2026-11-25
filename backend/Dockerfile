# Imagem única do sistema: a API e as telas do frontend, servidas juntas
# pelo Express (requisito 5.4 do enunciado: o container do backend serve o
# frontend).
#
# ATENÇÃO: o contexto de build é a RAIZ do repositório (precisa enxergar
# backend/ e frontend/). O docker-compose.yml já faz isso; à mão seria:
#   docker build -f backend/Dockerfile .

# ---------- ESTÁGIO 1: frontend ----------
# Compila as telas (React + Vite) para HTML/CSS/JS estáticos em dist/.
FROM node:22-alpine AS frontend

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------- ESTÁGIO 2: builder do backend ----------
# Imagem base com Node.js. "alpine" é uma distribuição Linux minimalista,
# usada aqui só pra ter as ferramentas de build (sem os node_modules de dev
# sobrarem na imagem final).
FROM node:22-alpine AS builder

# Define a pasta de trabalho dentro do container — tudo que vier depois
# (COPY, RUN) acontece relativo a essa pasta.
WORKDIR /app

# Copia SÓ os arquivos de dependência (e o schema do Prisma, que o
# postinstall "prisma generate" precisa) e instala. Como o código-fonte ainda
# não foi copiado, o Docker reaproveita esta camada entre builds enquanto as
# dependências não mudarem — alterar uma linha em src/ não reinstala nada.
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma

# "npm ci" (e não "npm install"): instala EXATAMENTE as versões travadas no
# package-lock.json e falha se ele estiver fora de sincronia com o
# package.json. O build fica reproduzível: a imagem de hoje e a de daqui a um
# mês têm as mesmas dependências. O postinstall já gera o client do Prisma.
RUN npm ci

# Agora sim o código-fonte.
COPY backend/tsconfig.json ./
COPY backend/src ./src

# Compila o TypeScript (roda o script "build" que você já tem).
RUN npm run build

# ---------- ESTÁGIO 3: produção ----------
# Começa uma imagem NOVA, do zero — nada do estágio anterior vem
# automaticamente. Isso é o que torna a imagem final pequena.
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json ./

# Só as dependências de PRODUÇÃO:
#   --omit=dev       sem typescript, tsx, @types...
#   --omit=optional  o npm instalaria o Prisma CLI e o TypeScript mesmo com
#                    --omit=dev, por serem dependências "peer opcionais" do
#                    @prisma/client. Em produção só precisamos do client já
#                    gerado — e menos código na imagem é menos superfície de
#                    ataque (e ~120 MB a menos).
#   --ignore-scripts não roda o postinstall ("prisma generate"), que
#                    precisaria justamente do CLI que deixamos de fora.
RUN npm ci --omit=dev --omit=optional --ignore-scripts && npm cache clean --force

# Copia do ESTÁGIO ANTERIOR (--from=builder) apenas o que é necessário
# pra rodar: o JS compilado e o client do Prisma já gerado.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# As telas compiladas no estágio 1. O backend procura por elas em
# /app/public (ver src/middlewares/frontend.ts) e as serve na mesma porta.
COPY --from=frontend /frontend/dist ./public

# Deixa de rodar como root. A imagem oficial do Node já traz o usuário "node",
# sem privilégios: se alguém explorar uma falha na aplicação, cai num usuário
# que não consegue instalar pacotes nem alterar arquivos do sistema.
USER node

# Documenta (não publica de fato — isso é o docker-compose que faz) qual
# porta a aplicação escuta dentro do container.
EXPOSE 3000

# Comando que roda quando o container inicia. Note: usa "node" direto,
# não "npm start" — evita um processo extra (o npm) só pra chamar o node.
CMD ["node", "dist/server.js"]
