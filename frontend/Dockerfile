# syntax=docker/dockerfile:1.7
# ────────────────────────────────────────────────────────────
# Frontend Dockerfile — gym-tracker SPA (dev only)
# Used by docker-compose.dev.yml for hot-reload development.
# Production uses the root Dockerfile (unified image).
# Targets: dev (vite dev) | build (static, for testing)
# ────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-bookworm-slim

# ─── Dev target: vite dev server with HMR ───
FROM node:${NODE_VERSION} AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NODE_ENV=development
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ─── Build target: vite build → static files (for unit tests) ───
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
