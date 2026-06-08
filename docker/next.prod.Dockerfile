# syntax=docker/dockerfile:1
# These ARG/ENV are PUBLIC by design (NEXT_PUBLIC_*, Turnstile SITE keys, Pusher
# key, Google client id) — intentionally inlined into the client bundle, so the
# "secrets in ARG/ENV" lint rule is a false positive here.
# check=skip=SecretsUsedInArgOrEnv
# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build for ANY Next.js app in the pnpm monorepo.
# Parameterized by:
#   APP_FILTER → pnpm package name (e.g. apsara-home-frontend, dreambuild)
#   APP_DIR    → path of the app under the repo (e.g. apps/apsara-home-frontend)
#
# Produces a tiny "standalone" runtime image so the VPS uses very little RAM
# at runtime. The heavy build runs in CI (GitHub Actions), NOT on the VPS.
# ─────────────────────────────────────────────────────────────────────────────
ARG NODE_VERSION=22-alpine

# ---------- deps: install workspace dependencies (cached layer) ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
ARG APP_FILTER
COPY . .
RUN CI=true pnpm install --frozen-lockfile --filter ${APP_FILTER}...

# ---------- builder: compile the Next.js app ----------
FROM deps AS builder
WORKDIR /workspace
ARG APP_FILTER

# Normalize the build output dir to ".next" so standalone paths are predictable.
# (apsara-home-frontend defaults to ".next_build" for a Windows-only workaround.)
ENV NEXT_DIST_DIR=.next
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Public build-time config — baked into the client bundle here in CI.
ARG NEXT_PUBLIC_COMMUNITY_API_URL
ARG NEXT_PUBLIC_REALTIME_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AFHOME_API_URL
ARG NEXT_PUBLIC_LARAVEL_API_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_PUSHER_KEY
ARG NEXT_PUBLIC_PUSHER_CLUSTER
ARG NEXT_PUBLIC_TAWK_PROPERTY_ID
ARG NEXT_PUBLIC_TAWK_WIDGET_ID
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG USER_LOGIN_CLOUDFLARE_SITE_KEY
ARG USER_SIGNUP_CLOUDFLARE_SITE_KEY
ARG USER_FORGOT_PASSWORD_CLOUDFLARE_SITE_KEY
ARG ADMIN_LOGIN_CLOUDFLARE_SITE_KEY
ENV NEXT_PUBLIC_COMMUNITY_API_URL=${NEXT_PUBLIC_COMMUNITY_API_URL} \
    NEXT_PUBLIC_REALTIME_URL=${NEXT_PUBLIC_REALTIME_URL} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_AFHOME_API_URL=${NEXT_PUBLIC_AFHOME_API_URL} \
    NEXT_PUBLIC_LARAVEL_API_URL=${NEXT_PUBLIC_LARAVEL_API_URL} \
    NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_PUSHER_KEY=${NEXT_PUBLIC_PUSHER_KEY} \
    NEXT_PUBLIC_PUSHER_CLUSTER=${NEXT_PUBLIC_PUSHER_CLUSTER} \
    NEXT_PUBLIC_TAWK_PROPERTY_ID=${NEXT_PUBLIC_TAWK_PROPERTY_ID} \
    NEXT_PUBLIC_TAWK_WIDGET_ID=${NEXT_PUBLIC_TAWK_WIDGET_ID} \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID} \
    USER_LOGIN_CLOUDFLARE_SITE_KEY=${USER_LOGIN_CLOUDFLARE_SITE_KEY} \
    USER_SIGNUP_CLOUDFLARE_SITE_KEY=${USER_SIGNUP_CLOUDFLARE_SITE_KEY} \
    USER_FORGOT_PASSWORD_CLOUDFLARE_SITE_KEY=${USER_FORGOT_PASSWORD_CLOUDFLARE_SITE_KEY} \
    ADMIN_LOGIN_CLOUDFLARE_SITE_KEY=${ADMIN_LOGIN_CLOUDFLARE_SITE_KEY}

RUN pnpm --filter ${APP_FILTER} build

# ---------- runner: minimal standalone runtime ----------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ARG APP_DIR
ENV APP_DIR=${APP_DIR}

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# Standalone server + traced node_modules (replicates monorepo layout under /app)
COPY --from=builder --chown=nextjs:nodejs /workspace/${APP_DIR}/.next/standalone ./
# Static assets and public files must be copied separately (not traced).
COPY --from=builder --chown=nextjs:nodejs /workspace/${APP_DIR}/.next/static ./${APP_DIR}/.next/static
COPY --from=builder --chown=nextjs:nodejs /workspace/${APP_DIR}/public ./${APP_DIR}/public

USER nextjs
EXPOSE 3000

# APP_DIR is baked at build time, so the shell form resolves it at runtime.
CMD ["sh", "-c", "node ${APP_DIR}/server.js"]
