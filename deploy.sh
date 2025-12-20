#!/bin/bash

# Script de Deploy Automático - MedVision Backend
# Este script facilita o deploy da aplicação no VPS

set -e

echo "🚀 Iniciando deploy do MedVision Backend..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se o .env existe
if [ ! -f .env ]; then
    echo -e "${RED}❌ Erro: Arquivo .env não encontrado!${NC}"
    echo "Copie o .env.example e configure as variáveis:"
    echo "cp .env.example .env && nano .env"
    exit 1
fi

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado!${NC}"
    exit 1
fi

# Verificar se Docker Compose está disponível
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose (plugin) não está instalado!${NC}"
    echo "Instale com: apt-get install docker-compose-plugin"
    exit 1
fi

# Pull das últimas mudanças (se estiver em um repositório git)
if [ -d .git ]; then
    echo -e "${BLUE}📥 Baixando últimas atualizações...${NC}"
    git fetch origin
    git reset --hard origin/main
fi

# Parar containers existentes
echo -e "${BLUE}🛑 Parando containers existentes...${NC}"
docker compose down

# Construir e subir containers
echo -e "${BLUE}🏗️  Construindo e iniciando containers...${NC}"
docker compose up -d --build

# Aguardar o banco de dados estar pronto
echo -e "${BLUE}⏳ Aguardando banco de dados...${NC}"
sleep 10

# Executar inicialização do banco
echo -e "${BLUE}🗄️  Inicializando banco de dados...${NC}"
chmod +x init-db.sh
./init-db.sh

# Executar seed do admin
echo -e "${BLUE}🌱 Criando admin inicial...${NC}"
docker compose exec -T app pnpm tsx scripts/seed-admin.ts

# Verificar status
echo -e "${BLUE}📊 Status dos containers:${NC}"
docker compose ps

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo "📝 Comandos úteis:"
echo "  - Ver logs: docker compose logs -f"
echo "  - Parar: docker compose down"
echo "  - Reiniciar: docker compose restart"
echo ""
echo "🌐 API disponível em: http://localhost:3000"
echo "📚 Documentação: http://localhost:3000/v1/docs"
