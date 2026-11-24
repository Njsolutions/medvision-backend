# Imagem para deploy no Dokploy (build por Dockerfile).
# Variáveis de ambiente: configure na aba "Environment" do Dokploy (lista em .env.example).
# Domínio, HTTPS e roteamento: configure na aba "Domains" do Dokploy (porta 3333).
# Um banco PostgreSQL próprio do Dokploy ou externo: DATABASE_URL aponta para ele.

# ---------- build ----------
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

COPY . .

# `prisma generate` só lê o schema e não conecta ao banco; este valor existe apenas durante o build.
ARG DATABASE_URL=postgresql://user:pass@localhost:5432/db
ENV DATABASE_URL=$DATABASE_URL
RUN pnpm run db:generate
RUN pnpm run build
RUN pnpm prune --prod

# ---------- runtime ----------
FROM node:22-alpine

WORKDIR /app

# Cookies Secure e documentação desligada dependem disso. Pode ser sobrescrito pelo Dokploy.
ENV NODE_ENV=production

# O runtime não usa pnpm nem baixa nada da internet no start: só o Node.
COPY package.json ./
COPY prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets
# Só o que o runtime precisa: o resolver de paths e o seed do master (único seed inicial).
COPY --from=builder /app/scripts/register-dist-paths.cjs ./scripts/register-dist-paths.cjs
COPY --from=builder /app/scripts/seed-master.ts ./scripts/seed-master.ts

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3333

# Dá tempo para as migrations rodarem antes do primeiro /health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3333; require('http').get(\`http://127.0.0.1:\${port}/health\`, (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# No Dokploy a API roda em uma única instância, então aplicar as migrations no start é seguro (sem corrida).
# Se a migration falhar, o container encerra e o deploy falha (veja os logs do deploy no Dokploy).
# `exec` deixa o Node como PID 1, para receber o SIGTERM no deploy e encerrar com calma.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node --require ./scripts/register-dist-paths.cjs dist/server.js"]
