#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

COMPOSE="docker compose -f docker-compose.prod.yml"

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

if ! docker network inspect root_default > /dev/null 2>&1; then
    echo -e "${BLUE}Creating external network root_default...${NC}"
    docker network create root_default
fi

echo -e "${BLUE}Pulling latest code from origin/main...${NC}"
git fetch origin
git pull --ff-only origin main

echo -e "${BLUE}Stopping existing containers...${NC}"
$COMPOSE down

echo -e "${BLUE}Building and starting containers...${NC}"
$COMPOSE up -d --build

echo -e "${BLUE}Waiting for app to be healthy...${NC}"
for i in $(seq 1 24); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' medvision-api 2>/dev/null || echo "not_found")
    if [ "$STATUS" = "healthy" ]; then
        echo -e "${GREEN}App is healthy!${NC}"
        break
    fi
    if [ "$i" = "24" ]; then
        echo -e "${RED}App did not become healthy after 2 minutes.${NC}"
        echo "Check logs: $COMPOSE logs --tail=50"
        exit 1
    fi
    echo "  status: $STATUS — waiting 5s..."
    sleep 5
done

echo -e "${BLUE}Ensuring initial admin exists...${NC}"
$COMPOSE exec -T app pnpm run db:seed:admin

echo -e "${BLUE}Cleaning up unused Docker resources...${NC}"
docker image prune -f
docker container prune -f

echo -e "${BLUE}Container status:${NC}"
$COMPOSE ps

echo -e "${GREEN}Deploy completed successfully.${NC}"
echo ""
echo "Useful commands:"
echo "  - Logs:    $COMPOSE logs -f"
echo "  - Stop:    $COMPOSE down"
echo "  - Restart: $COMPOSE restart"
echo ""
echo "API:  https://medvision.njsolutions.com.br"
echo "Docs: https://medvision.njsolutions.com.br/v1/docs"
