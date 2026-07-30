# ────────────────────────────────────────────────────────────
# gym-tracker — convenient commands
# ────────────────────────────────────────────────────────────

# Detect docker compose command (v1 vs v2)
DOCKER_COMPOSE := $(shell docker compose version > /dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

.PHONY: help build up down dev logs clean test e2e push status

help:           ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build:          ## Build production images
	$(DOCKER_COMPOSE) build

up:             ## Start production stack (detached)
	$(DOCKER_COMPOSE) up -d --build
	@echo "✅ gym-tracker is up at http://localhost:8080"

down:           ## Stop production stack
	$(DOCKER_COMPOSE) down

dev:            ## Start dev stack with hot reload
	$(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml up --build

dev-d:          ## Start dev stack detached
	$(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml up -d --build

dev-down:       ## Stop dev stack
	$(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml down

logs:           ## Tail production logs
	$(DOCKER_COMPOSE) logs -f

logs-backend:   ## Tail backend logs only
	$(DOCKER_COMPOSE) logs -f backend

logs-frontend:  ## Tail frontend logs only
	$(DOCKER_COMPOSE) logs -f frontend

test:           ## Run backend + frontend tests in container
	$(DOCKER_COMPOSE) --profile test run --rm backend-test
	$(DOCKER_COMPOSE) --profile test run --rm frontend-test

e2e:            ## Run E2E tests (assumes dev or prod stack is up)
	$(DOCKER_COMPOSE) --profile e2e run --rm e2e

status:         ## Show running containers
	$(DOCKER_COMPOSE) ps

clean:          ## Stop + remove containers, networks, volumes
	$(DOCKER_COMPOSE) down -v
	@echo "🧹 Cleaned. Data volume gym-data is removed (DB gone)."

clean-keep-db:  ## Stop + remove containers, networks, KEEP data volume
	$(DOCKER_COMPOSE) down
	@echo "🧹 Containers removed. Data volume gym-data preserved."

shell-backend:  ## Shell into backend container
	$(DOCKER_COMPOSE) exec backend sh

shell-frontend: ## Shell into frontend container
	$(DOCKER_COMPOSE) exec frontend sh
