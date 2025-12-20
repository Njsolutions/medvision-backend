# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código-fonte
COPY . .

# Gerar Prisma Client (com DATABASE_URL temporária para build)
ARG DATABASE_URL=postgresql://user:pass@localhost:5432/db
ENV DATABASE_URL=$DATABASE_URL
RUN pnpm run db:generate

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Instalar apenas dependências de produção
RUN pnpm install --frozen-lockfile --prod

# Copiar Prisma Client gerado do builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copiar código fonte do stage anterior
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expor porta
EXPOSE 3333

# Health check - testa se a porta está respondendo (aceita qualquer resposta HTTP)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "const port = process.env.PORT || 3333; require('http').get(\`http://127.0.0.1:\${port}/\`, (r) => {process.exit(0)}).on('error', () => process.exit(1))"

# Comando para iniciar
CMD ["pnpm", "start"]
