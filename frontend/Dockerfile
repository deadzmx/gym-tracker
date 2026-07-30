# syntax=docker/dockerfile:1.7
# ────────────────────────────────────────────────────────────
# Frontend Dockerfile — gym-tracker SPA
# Targets: dev (vite dev) | build (static) | prod (nginx)
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

# ─── Build target: vite build → static files ───
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ─── Prod target: nginx serving static files ───
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1
