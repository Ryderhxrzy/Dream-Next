FROM node:22-alpine

WORKDIR /workspace

ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/apsara-home-frontend/package.json apps/apsara-home-frontend/package.json
COPY apps/Dreambuild-Landing-Page/package.json apps/Dreambuild-Landing-Page/package.json
COPY apps/Apsara-Home-Mobile/package.json apps/Apsara-Home-Mobile/package.json
COPY apps/apsara-home-backend/package.json apps/apsara-home-backend/package.json

RUN CI=true pnpm install --frozen-lockfile --filter apsara-home-frontend --filter dreambuild

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev:frontend"]
