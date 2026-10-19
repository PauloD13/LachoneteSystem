# ---------- ESTÁGIO 1: builder ----------
# Imagem base com Node.js. "alpine" é uma distribuição Linux minimalista,
# usada aqui só pra ter as ferramentas de build (sem os node_modules de dev
# sobrarem na imagem final).
FROM node:22-alpine AS builder

# Define a pasta de trabalho dentro do container — tudo que vier depois
# (COPY, RUN) acontece relativo a essa pasta.
WORKDIR /app

# Copia SÓ os arquivos de dependência primeiro (não o código ainda).
# Isso é uma otimização de cache: o Docker reaproveita essa camada entre
# builds se package.json não mudou, evitando reinstalar tudo de novo
# só porque você alterou uma linha de código.
COPY package.json package-lock.json ./

# Instala TODAS as dependências (incluindo devDependencies — precisa do
# typescript e do prisma CLI pra compilar e gerar o client agora).
RUN npm install

# Agora copia o resto do código-fonte (schema.prisma, src/, tsconfig.json).
COPY . .

# Gera o client do Prisma (precisa do schema.prisma, que já foi copiado).
RUN npx prisma generate

# Compila o TypeScript (roda o script "build" que você já tem).
RUN npm run build

# ---------- ESTÁGIO 2: produção ----------
# Começa uma imagem NOVA, do zero — nada do estágio anterior vem
# automaticamente. Isso é o que torna a imagem final pequena.
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

# Instala só as dependências de PRODUÇÃO (sem typescript, tsx, etc — não
# são necessárias pra rodar o JS já compilado).
RUN npm install --omit=dev

# Copia do ESTÁGIO ANTERIOR (--from=builder) apenas o que é necessário
# pra rodar: o JS compilado e o client do Prisma já gerado.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Documenta (não publica de fato — isso é o docker-compose que faz) qual
# porta a aplicação escuta dentro do container.
EXPOSE 3000

# Comando que roda quando o container inicia. Note: usa "node" direto,
# não "npm start" — evita um processo extra (o npm) só pra chamar o node.
CMD ["node", "dist/server.js"]
