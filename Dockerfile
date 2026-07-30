# syntax=docker/dockerfile:1.7
# ────────────────────────────────────────────────────────────
# Unified Dockerfile — gym-tracker
# Builds frontend (vite) + backend (express) in a single image
# Express serves both the API and the static frontend files
# One process, one port, one image.
#
# Targets:
#   - dev  : tsx watch + frontend dist (for local Docker dev)
#   - build: build everything (used internally)
#   - prod : production image (single node process)
# ────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-bookworm-slim

# ─── Base: shared deps ───
FROM node:${NODE_VERSION} AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ─── Frontend deps layer (cached independently) ───
FROM base AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ─── Frontend build ───
FROM frontend-deps AS frontend-build
WORKDIR /app/frontend
COPY frontend/ ./
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

# ─── Backend deps layer (cached independently) ───
FROM base AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ─── Backend build ───
FROM backend-deps AS backend-build
WORKDIR /app/backend
COPY backend/ ./
RUN npm run build \
    && npm prune --omit=dev \
    && apt-get purge -y python3 make g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# ─── Prod: combined runtime ───
# Single node process serves both the API and the static frontend.
FROM node:${NODE_VERSION}-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV STATIC_DIR=/app/frontend/dist

# Copy the prebuilt backend (with prod-only deps)
COPY --from=backend-build /app/backend /app/backend
# Copy the prebuilt frontend static files
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -q --spider http://localhost:3001/api/health || exit 1

EXPOSE 3001
CMD ["node", "backend/dist/server.js"]
