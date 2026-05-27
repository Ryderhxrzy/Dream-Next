#!/bin/sh
set -e

APP_DIR="/app"
CREDENTIALS_RELATIVE_PATH="${FIREBASE_CREDENTIALS_PATH:-storage/firebase-credentials.json}"

case "$CREDENTIALS_RELATIVE_PATH" in
  /*) CREDENTIALS_PATH="$CREDENTIALS_RELATIVE_PATH" ;;
  *) CREDENTIALS_PATH="$APP_DIR/$CREDENTIALS_RELATIVE_PATH" ;;
esac

if [ -n "$FIREBASE_CREDENTIALS_JSON" ]; then
  mkdir -p "$(dirname "$CREDENTIALS_PATH")"
  printf "%s" "$FIREBASE_CREDENTIALS_JSON" > "$CREDENTIALS_PATH"
  chmod 600 "$CREDENTIALS_PATH"
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  if [ -f .env.docker ]; then
    cp .env.docker .env
  elif [ -f .env.example ]; then
    cp .env.example .env
  fi
fi

if [ ! -f vendor/autoload.php ]; then
  composer install --no-interaction --prefer-dist
fi

if [ ! -d node_modules/.bin ]; then
  npm install
fi

if grep -q "^APP_KEY=$" .env 2>/dev/null; then
  php artisan key:generate --force >/dev/null 2>&1 || true
fi

php artisan config:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

php artisan migrate --force || true

exec "$@"
