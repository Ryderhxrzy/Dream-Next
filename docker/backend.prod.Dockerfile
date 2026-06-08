# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build for the Laravel backend (PHP 8.4).
# Used by BOTH the web container and the queue worker (same image, different CMD).
#
#   builder → composer (no-dev) + vite asset build (needs Node, only in CI)
#   runner  → lean PHP-CLI runtime with just the extensions Laravel needs
#
# The entrypoint (migrations, key:generate, firebase creds) is preserved as-is.
# ─────────────────────────────────────────────────────────────────────────────

# ---------- builder: vendor + compiled front-end assets ----------
FROM php:8.4-cli-alpine AS builder
WORKDIR /app

RUN apk add --no-cache \
        bash git unzip zip nodejs npm \
        icu-dev libpq-dev oniguruma-dev linux-headers $PHPIZE_DEPS \
    && docker-php-ext-install intl mbstring pcntl pdo pdo_pgsql

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY apps/apsara-home-backend/ /app/

RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader \
    && npm ci \
    && npm run build \
    && chmod -R ug+rwx storage bootstrap/cache

# ---------- runner: production runtime ----------
FROM php:8.4-cli-alpine AS runner
WORKDIR /app

# Runtime libs + build PHP extensions, then drop the build-only headers.
# nodejs/npm kept so the entrypoint's node_modules safety-net never breaks.
RUN apk add --no-cache bash curl icu-libs libpq oniguruma postgresql-client nodejs npm \
    && apk add --no-cache --virtual .build-deps icu-dev libpq-dev oniguruma-dev linux-headers $PHPIZE_DEPS \
    && docker-php-ext-install intl mbstring pcntl pdo pdo_pgsql \
    && apk del .build-deps

# composer kept available for the entrypoint's safety-net fallback (rarely runs).
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Built application: vendor, compiled assets (public/build), pruned node_modules.
COPY --from=builder /app /app
COPY apps/apsara-home-backend/docker/backend/entrypoint.sh /usr/local/bin/backend-entrypoint.sh
RUN chmod +x /usr/local/bin/backend-entrypoint.sh \
    && chmod -R ug+rwx storage bootstrap/cache

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/backend-entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
