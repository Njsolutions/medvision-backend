#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m' 
RED='\033[0;31m' 
NC='\033[0m' 

echo -e "${BLUE}Starting MedVision Backend deploy...${NC}"

if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found.${NC}"
    echo "Create it from .env.example and configure the required variables:"
    echo "cp .env.example .env && nano .env"
    exit 1
fi

if ! command -v docker > /dev/null 2>&1; then
    echo -e "${RED}Docker is not installed.${NC}"
    exit 1
fi

if ! docker compose version > /dev/null 2>&1; then
    echo -e "${RED}Docker Compose plugin is not installed.${NC}"
    echo "Install it with: apt-get install docker-compose-plugin"
    exit 1
fi

if [ -d .git ]; then
    echo -e "${BLUE}Fetching latest repository metadata...${NC}"
    git fetch origin
    git pull --ff-only origin main
fi

echo -e "${BLUE}Stopping existing containers...${NC}"
docker compose down

echo -e "${BLUE}Building and starting containers...${NC}"
docker compose up -d --build

echo -e "${BLUE}Waiting for services...${NC}"
sleep 10

echo -e "${BLUE}Running database migrations...${NC}"
docker compose exec -T app pnpm run db:migrate

echo -e "${BLUE}Ensuring initial admin exists...${NC}"
docker compose exec -T app pnpm run db:seed:admin

echo -e "${BLUE}Container status:${NC}"
docker compose ps

echo -e "${GREEN}Deploy completed successfully.${NC}"
echo ""
echo "Useful commands:"
echo "  - Logs: docker compose logs -f"
echo "  - Stop: docker compose down"
echo "  - Restart: docker compose restart"
echo ""
echo "API: http://localhost:3333"
echo "Docs: http://localhost:3333/v1/docs"
