FROM php:8.4-cli-alpine

WORKDIR /app

RUN apk add --no-cache \
    bash \
    curl \
    git \
    icu-dev \
    libpq-dev \
    linux-headers \
    oniguruma-dev \
    postgresql-client \
    unzip \
    zip \
    && docker-php-ext-install intl mbstring pcntl pdo pdo_pgsql

# Install Redis extension
RUN apk add --no-cache redis && \
    pecl install redis && \
    docker-php-ext-enable redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY . .

RUN composer install --no-dev --optimize-autoloader

# Run queue worker
CMD ["php", "artisan", "queue:work", "redis", "--sleep=3", "--tries=3", "--timeout=90"]
