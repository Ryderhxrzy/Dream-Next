# CI/CD Migration — Build on GitHub Actions, Deploy via GHCR + Dokploy

Goal: stop building Docker images on the VPS (20–40 min, 4 GB+ RAM). Instead,
GitHub Actions builds + pushes images to **GHCR**, and Dokploy just **pulls**
them. Result: deploys in minutes, near-zero VPS RAM during deploy.

```
git push → GitHub Actions → build all images (parallel, cached)
        → push to ghcr.io/dreamnext-af-home/<service>:<latest|sha>
        → Dokploy pulls images → docker compose up -d (Traefik unchanged)
```

## Services & images

| Service            | Image (`ghcr.io/dreamnext-af-home/…`) | Dockerfile                     |
|--------------------|----------------------------------------|--------------------------------|
| apsara-home-frontend | `afhome-frontend`                    | `docker/next.prod.Dockerfile`  |
| dreambuild         | `afhome-dreambuild`                     | `docker/next.prod.Dockerfile`  |
| community-frontend | `community-frontend`                    | `docker/next.prod.Dockerfile`  |
| Laravel backend    | `afhome-backend` (web **and** worker)   | `docker/backend.prod.Dockerfile` |
| community-backend  | `community-backend`                     | `docker/node.prod.Dockerfile`  |
| realtime-service   | `realtime-service`                      | `docker/node.prod.Dockerfile`  |
| redis              | official `redis:7-alpine` (no build)    | —                              |

## 1. GitHub setup (one-time)

1. **Repo/Org → Settings → Actions → General → Workflow permissions** →
   **Read and write permissions**. ✅ (already done)
2. **PAT (classic)** with scope **`read:packages`** for Dokploy to pull. ✅
   (already created — authorize SSO for `Dreamnext-AF-Home` if prompted)
3. **Repo → Settings → Secrets and variables → Actions → Variables** — add the
   public build-time values (baked into the Next.js client bundle in CI):

   ```
   NEXT_PUBLIC_API_URL                = https://backend.afhome.ph
   NEXT_PUBLIC_LARAVEL_API_URL        = https://backend.afhome.ph
   NEXT_PUBLIC_AFHOME_API_URL         = https://backend.afhome.ph
   NEXT_PUBLIC_COMMUNITY_API_URL      = https://community-backend.afhome.ph
   NEXT_PUBLIC_REALTIME_URL           = https://realtime.afhome.ph
   NEXT_PUBLIC_BASE_URL               = https://afhome.ph
   NEXT_PUBLIC_SITE_URL               = https://afhome.ph
   NEXT_PUBLIC_APP_URL                = https://afhome.ph
   NEXT_PUBLIC_PUSHER_KEY             = <public pusher key>
   NEXT_PUBLIC_PUSHER_CLUSTER         = ap1
   NEXT_PUBLIC_TAWK_PROPERTY_ID       = <…>
   NEXT_PUBLIC_TAWK_WIDGET_ID         = <…>
   NEXT_PUBLIC_GOOGLE_CLIENT_ID       = <public google client id>
   USER_LOGIN_CLOUDFLARE_SITE_KEY     = <turnstile site key>
   USER_SIGNUP_CLOUDFLARE_SITE_KEY    = <turnstile site key>
   USER_FORGOT_PASSWORD_CLOUDFLARE_SITE_KEY = <turnstile site key>
   ADMIN_LOGIN_CLOUDFLARE_SITE_KEY    = <turnstile site key>
   ```

   > These are **public** (visible in the browser anyway). Anything truly secret
   > (NEXTAUTH_SECRET, API secret keys, DB passwords) stays a **runtime env in
   > Dokploy** and is NOT baked into images.

4. *(Optional)* **Secrets** — `DOKPLOY_WEBHOOK_URL_MAIN` /
   `DOKPLOY_WEBHOOK_URL_COMMUNITY` to auto-redeploy after a build. Leave unset to
   deploy manually (recommended while validating).

## 2. Run the first build

- Merge this branch (`feature/cicd-ghcr`) to `main`, **or** trigger
  **Actions → Build & Push Images (GHCR) → Run workflow** manually.
- Watch the 6 services build in parallel. First run is slower (cold cache);
  later runs are fast.
- After success, the images appear under **GitHub → org → Packages**.
- **Make packages readable by Dokploy:** each package → **Package settings** →
  either set visibility appropriately or confirm the PAT user has read access.

## 3. Dokploy setup

1. **Settings → Registry → Add Registry**
   - URL: `ghcr.io`
   - Username: `mgmtafhomebiz-hash`
   - Password: the `read:packages` PAT
2. For **each** Compose app (main stack + community stack):
   - Switch the deployment source from **Build Path** to the **Docker Compose**
     file in this repo (`docker-compose.prod.yml` /
     `docker-compose.community.prod.yml`). Dokploy will now `pull` instead of
     `build`.
   - Keep all existing **runtime env vars** (DB creds, NEXTAUTH_SECRET, PayMongo,
     couriers, etc.) — these are unchanged.
   - *(Optional)* set `IMAGE_TAG` env (see Rollback).

## 4. Migration order (low downtime)

1. Land code + run CI → confirm all 6 images pushed to GHCR.
2. Add the registry credential in Dokploy (step 3.1).
3. Switch the **community stack** first (lower traffic) → redeploy → verify
   `community.afhome.ph`, `community-backend.afhome.ph`, `realtime.afhome.ph`.
4. Switch the **main stack** → redeploy → verify `afhome.ph`,
   `backend.afhome.ph`. Migrations run automatically via the Laravel entrypoint.
5. Traefik labels/routing are unchanged, so certs and hostnames keep working.

> Note on "zero downtime": with single-VPS Docker Compose, `up -d` recreates
> changed containers, so there is a brief per-service blip. Traefik retries
> mask most of it. True zero-downtime needs replicas/blue-green (future work).

## 5. Rollback

Images are tagged with the full git SHA. To roll back:

- In Dokploy, set the stack env `IMAGE_TAG=<previous-sha>` and redeploy, **or**
- Re-run the older successful workflow to re-tag `latest`.

`docker-compose.*.prod.yml` uses `image: …:${IMAGE_TAG:-latest}`, so unset =
latest, set = pinned.

## What changed in the repo

- `docker/next.prod.Dockerfile` → multi-stage **standalone** (tiny runtime, low RAM)
- `docker/node.prod.Dockerfile` → multi-stage, `node:22-slim` (Prisma-safe);
  removed the silent `build || true` / `start || dev` fallback
- `docker/backend.prod.Dockerfile` → multi-stage (build assets in CI, lean PHP runtime)
- `apps/*/next.config.ts` → added `output: "standalone"` + `outputFileTracingRoot`
- `.github/workflows/build-push.yml` → parallel build + push (latest + SHA) + cache
- `docker-compose.prod.yml`, `docker-compose.community.prod.yml` → `build:` → `image:`
- `.dockerignore` → expanded

## Troubleshooting

- **Next build OOM in CI**: GitHub runners have ~7 GB — fine. The frontend build
  already sets `NODE_OPTIONS=--max-old-space-size=4096`.
- **Standalone app 404s on static/CSS**: confirm `public/` exists in the app and
  the runner COPY paths match `APP_DIR`.
- **Dokploy can't pull (`denied`)**: re-check the PAT `read:packages` scope + SSO
  authorization, and the registry login in Dokploy.
- **Prisma engine error**: handled by `node:22-slim` + `openssl`; if it persists,
  add `binaryTargets` for `debian-openssl-3.0.x` in `schema.prisma`.
