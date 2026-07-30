# syntax=docker/dockerfile:1.7
# ────────────────────────────────────────────────────────────
# E2E Dockerfile — Playwright runner
# Image: ghcr.io/deadzmx/gym-tracker-e2e
# ────────────────────────────────────────────────────────────

FROM mcr.microsoft.com/playwright:v1.62.0-jammy

WORKDIR /app

# Install only deps (cache layer)
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Copy tests
COPY playwright.config.js ./
COPY tests ./tests

# Default: run all tests
CMD ["npx", "playwright", "test"]
