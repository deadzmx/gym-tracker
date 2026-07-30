# ────────────────────────────────────────────────────────────
# gym-tracker — convenient commands (unified image)
# ────────────────────────────────────────────────────────────

# Detect docker compose command (v1 vs v2)
DOCKER_COMPOSE := $(shell docker compose version > /dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

.PHONY: help build up down dev logs clean test e2e push status shell

help:           ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build:          ## Build production image (frontend + backend unified)
	$(DOCKER_COMPOSE) build

up:             ## Start production stack (single container, detached)
	$(DOCKER_COMPOSE) up -d --build
	@echo "✅ gym-tracker is up at http://localhost:8123"

down:           ## Stop production stack
	$(DOCKER_COMPOSE) down

dev:            ## Start dev stack (2 containers: vite + tsx watch with hot reload)
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml up --build

dev-d:          ## Start dev stack detached
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml up -d --build

dev-down:       ## Stop dev stack
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml down

logs:           ## Tail production logs
	$(DOCKER_COMPOSE) logs -f

status:         ## Show running containers
	$(DOCKER_COMPOSE) ps

clean:          ## Stop + remove containers, networks, volumes
	$(DOCKER_COMPOSE) down -v
	@echo "🧹 Cleaned. Data volume gym-data is removed (DB gone)."

clean-keep-db:  ## Stop + remove containers, networks, KEEP data volume
	$(DOCKER_COMPOSE) down
	@echo "🧹 Containers removed. Data volume gym-data preserved."

shell:          ## Shell into the production container
	$(DOCKER_COMPOSE) exec app sh
