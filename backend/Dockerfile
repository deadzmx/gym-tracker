# syntax=docker/dockerfile:1.7
# ────────────────────────────────────────────────────────────
# Backend Dockerfile — gym-tracker API
# Targets: base | dev | prod
# ────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-bookworm-slim

FROM node:${NODE_VERSION} AS base
WORKDIR /app

# better-sqlite3 needs build tools (used at install time)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install deps first (cache-friendly)
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ─── Dev target: tsx watch, source bind-mounted at runtime ───
FROM base AS dev
COPY . .
ENV NODE_ENV=development
EXPOSE 3001
CMD ["npx", "tsx", "watch", "src/server.ts"]

# ─── Prod target: build TypeScript, run compiled JS ───
FROM base AS prod
COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
    && npm prune --omit=dev \
    && apt-get purge -y python3 make g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
EXPOSE 3001
# Tini-style: handle SIGTERM properly
CMD ["node", "dist/server.js"]
