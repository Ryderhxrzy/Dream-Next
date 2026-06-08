# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build for the Node backends in the monorepo:
#   community-backend (Hono + Prisma + PostgreSQL)
#   realtime-service  (Socket.IO + Redis)
#
# Parameterized by:
#   APP_FILTER → pnpm package name (community-backend | realtime-service)
#   APP_DIR    → path under the repo (apps/community-backend | apps/realtime-service)
#
# Uses debian-slim (not alpine) so Prisma's engine/SSL deps "just work".
# The build runs in CI; the VPS only runs the compiled output.
# ─────────────────────────────────────────────────────────────────────────────
ARG NODE_VERSION=22-slim

# ---------- base: pnpm + runtime libs ----------
FROM node:${NODE_VERSION} AS base
WORKDIR /workspace
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

# ---------- builder: install + compile (prisma generate && tsc) ----------
FROM base AS builder
ARG APP_FILTER
COPY . .
RUN CI=true pnpm install --frozen-lockfile --filter ${APP_FILTER}...
# Real build — no "|| true" mask. If the build fails, the image build fails
# (which is what we want: never silently ship a dev/tsx fallback to prod).
RUN pnpm --filter ${APP_FILTER} build

# ---------- runner: production runtime ----------
FROM base AS runner
ARG APP_FILTER
ARG APP_DIR
ENV NODE_ENV=production
ENV APP_FILTER=${APP_FILTER}
ENV APP_DIR=${APP_DIR}

# Copy the fully built workspace (compiled dist + generated Prisma client +
# node_modules). pnpm hoists/symlinks deps at the workspace root, so copying the
# whole workspace is the reliable way to keep those links intact.
COPY --from=builder /workspace ./

USER node
# community-backend → 4000, realtime-service → 4001 (set via PORT env in compose)
EXPOSE 4000 4001

CMD ["sh", "-c", "pnpm --filter ${APP_FILTER} start"]
