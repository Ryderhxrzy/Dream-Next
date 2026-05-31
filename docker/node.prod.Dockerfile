FROM node:22-alpine

WORKDIR /workspace

ARG APP_FILTER

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

COPY . .

RUN CI=true pnpm install --frozen-lockfile --filter ${APP_FILTER}

RUN pnpm --filter ${APP_FILTER} build 2>/dev/null || true

EXPOSE 4000

CMD ["sh", "-c", "pnpm --filter ${APP_FILTER} start 2>/dev/null || pnpm --filter ${APP_FILTER} dev"]
