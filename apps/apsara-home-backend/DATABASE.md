# Database & Local Run Guide — `apsara-home-backend`

How to run the AF Home backend (Laravel 12) locally against a **Neon** Postgres
database, how to configure Neon for **development** and **production**, and the
**artisan cache / `optimize` commands** you need when things behave unexpectedly.

> The backend lives at `apps/apsara-home-backend` inside the `fullstack-apsara`
> pnpm monorepo. Run backend artisan/composer commands **from this folder**;
> run `pnpm` workspace commands from the repo root.

---

## 1. Prerequisites

| Tool | Version | Notes |
| ------ | --------- | ------- |
| PHP | **8.2+** | `composer.json` requires `^8.2` |
| Composer | 2.x | |
| Node | **20.19+** | for Vite asset build |
| pnpm | 11.x | repo package manager (`pnpm@11.3.0`) |
| Neon account | — | managed Postgres, <https://neon.tech> |

### Required PHP extensions

Make sure these are enabled in your `php.ini` (uncomment the `extension=` lines
and restart your terminal / PHP):

```ini
extension=pdo_pgsql   ; talk to Neon (Postgres)
extension=pgsql
extension=intl        ; required by Laravel Number::format(), db:show, etc.
extension=fileinfo
```

Verify:

```bash
php -m | findstr /I "pdo_pgsql intl"   # Windows / PowerShell
php -m | grep -E "pdo_pgsql|intl"      # macOS / Linux
```

> If `intl` is missing you'll hit: *"The intl PHP extension is required to use
> the [format] method."* — it's required, not optional.

---

## 2. How the Neon connection works in this app

Neon is plain Postgres, **but** it routes connections to the right compute
endpoint using **SNI** (the TLS server name taken from your `DB_HOST`). This repo
adds a small custom connector for an edge case.

**`config/database.php`** (the `pgsql` block) carries an extra key:

```php
'sslmode'       => 'require',
'neon_endpoint' => env('DB_NEON_ENDPOINT'),
```

**`app/Providers/AppServiceProvider.php`** overrides the Postgres connector and,
*only if `DB_NEON_ENDPOINT` is set*, appends it to the DSN as a libpq option:

```php
$dsn = parent::getDsn($config);
if (!empty($config['neon_endpoint'])) {
    $dsn .= ";options='" . $config['neon_endpoint'] . "'";
}
```

### ⚠️ The golden rule: leave `DB_NEON_ENDPOINT` **empty**

The `options='endpoint=...'` trick is **only** for old drivers that cannot send
SNI. Modern PHP/libpq **does** send SNI, so setting `DB_NEON_ENDPOINT` makes the
endpoint named in the option fight the one inferred from your `-pooler` hostname,
and Neon rejects the connection.

| `DB_NEON_ENDPOINT` value | Result |
| -------------------------- | -------- |
| *(empty)* ✅ | SNI from the `-pooler` host identifies the endpoint → **connects** |
| `endpoint=ep-xxxx` ❌ | `Inconsistent project name inferred from SNI and project option` |
| a full `postgresql://…` URL ❌ | `unsupported options startup parameter: only '-c config=val' … are allowed` |

**Keep it blank** for any normal Neon connection (dev or prod). Only ever set it
if you connect with a legacy driver that genuinely cannot do SNI — which is not
the case here.

### Pooled vs direct endpoint — use the **direct** host for migrations

Every Neon branch exposes two hostnames:

| Endpoint | Hostname | Use for |
| -------- | -------- | ------- |
| **Pooled** | `ep-xxxx-pooler.<region>.aws.neon.tech` | the running app — many short, concurrent queries |
| **Direct** | `ep-xxxx.<region>.aws.neon.tech` (no `-pooler`) | **migrations / schema changes**, `db:seed`, any DDL |

The pooled host runs PgBouncer in **transaction mode**, which breaks the
multi-statement DDL transactions that Laravel migrations rely on. The symptom is a
**nondeterministic**:

> `SQLSTATE[25P02]: current transaction is aborted, commands ignored until end of transaction block`

…where the *reported* statement changes between runs (a `create table` one time, an
`alter table add constraint` the next). The migration is fine — the pooler is
desyncing the transaction. **Always run migrations against the direct host:**

```bash
# one-off override (Git Bash):   PowerShell: $env:DB_HOST="ep-xxxx.<region>.aws.neon.tech"; php artisan migrate
DB_HOST=ep-xxxx.<region>.aws.neon.tech php artisan migrate
```

**The pooler also breaks reads right after a migration.** Because PgBouncer keeps
long-lived server backends, a backend can still hold a cached `select *` plan from
before an `ALTER TABLE … ADD COLUMN`. The next read on that backend fails with:

> `SQLSTATE[0A000]: Feature not supported: cached plan must not change result type`

This is **persistent, not transient** — it keeps failing until those pooled
backends recycle. On the **direct** host every connection re-plans, so it never
happens.

**Recommendation:** for local dev, set `DB_HOST` to the **direct** host for
everything — pooling only matters under production load. In production, if you keep
the pooled host for the app, **recycle the Neon compute (or restart the app) after
any schema-changing deploy** to drop the stale cached plans.

---

## 3. Environment configuration

Copy the template, then fill in the database block:

```bash
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
php artisan key:generate
```

> The default `.env.example` ships with `DB_CONNECTION=sqlite`. For Neon, switch
> the database block to `pgsql` as shown below.

### Development `.env` (Neon dev branch)

Create a dedicated **dev branch** in your Neon project so development can't touch
production data. Use that branch's **direct** host (no `-pooler`) so both migrations
and post-migration reads work without the pooler quirks described in §2:

```env
DB_CONNECTION=pgsql
DB_HOST=ep-<your-dev-endpoint>.<region>.aws.neon.tech
DB_PORT=5432
DB_DATABASE=neondb
DB_USERNAME=<neon_user>
DB_PASSWORD=<neon_password>

# Leave EMPTY — SNI from the host identifies the endpoint.
DB_NEON_ENDPOINT=
```

`sslmode=require` and `search_path=public` are already applied by
`config/database.php`, so you don't repeat them in `.env`.

### Production `.env` (Neon main branch)

Same shape, pointing at your **production** Neon branch, plus the production app
flags:

```env
APP_ENV=production
APP_DEBUG=false

DB_CONNECTION=pgsql
DB_HOST=ep-<your-prod-endpoint>-pooler.<region>.aws.neon.tech
DB_PORT=5432
DB_DATABASE=neondb
DB_USERNAME=<neon_user>
DB_PASSWORD=<neon_password>
DB_NEON_ENDPOINT=
```

The connection mechanics are identical between dev and prod — **only the Neon
branch's host + credentials change**. What differs is caching (see §6).

> **Security:** `.env` holds live secrets. Confirm it is gitignored, never commit
> it, and rotate any keys that have been shared in plaintext.

---

## 4. First-time setup

From `apps/apsara-home-backend`:

```bash
composer install          # PHP dependencies
pnpm install              # (run once at repo root) JS deps for all apps
php artisan key:generate  # if you didn't already
php artisan migrate       # create tables in your Neon branch
# php artisan db:seed     # optional seed data
```

Sanity-check the connection (does not need a running server):

```bash
php artisan db:show --database=pgsql   # needs ext-intl for the summary table
php artisan tinker --execute="echo DB::connection('pgsql')->getPdo() ? 'OK' : 'FAIL';"
```

---

## 5. Running the application locally

### Backend

| Command | Where | What it does |
| --------- | ------- | -------------- |
| `php artisan serve` | backend folder | API only, at <http://localhost:8000> |
| `pnpm dev:backend:local` | repo root | same as above via the workspace filter |
| `composer dev` | backend folder | server **+** queue worker **+** live logs (pail) **+** Vite, all at once |
| `pnpm dev:backend` | repo root | runs the backend in Docker (`docker-compose.yml`) |

For most local API work, `php artisan serve` (or `composer dev` if you also need
the queue and Vite) is enough.

### Frontend

```bash
pnpm dev:frontend          # from repo root → Next.js at http://localhost:3000
```

### Redis (optional, for cache/queue testing)

```bash
pnpm dev:redis             # docker compose up -d redis
```

---

## 6. Artisan cache & `optimize` commands

Laravel caches config, routes, views, and events for speed. Those caches are
**snapshots** — after you edit `.env` or config files, a stale cache will keep
serving old values (this is the #1 cause of "I changed `.env` but nothing
happened").

### The one command to remember in development

```bash
php artisan optimize:clear
```

This clears **everything** — config, route, view, event, compiled, and app
caches — in a single shot. Run it whenever you change `.env` or a config file and
the change isn't taking effect.

It is equivalent to running all of these:

```bash
php artisan config:clear     # forget cached config (re-reads .env)
php artisan route:clear      # forget cached routes
php artisan view:clear       # forget compiled Blade views
php artisan event:clear      # forget cached event listeners
php artisan cache:clear      # flush the application cache store
php artisan clear-compiled   # remove the compiled class file
```

> **In development, do NOT cache config.** Leave config uncached so `.env` edits
> apply immediately. If you ever run `php artisan config:cache` locally, follow it
> with `php artisan config:clear` to go back to live `.env` reads. This project is
> `APP_ENV=local` in dev — keep it uncached.

### Production: build the caches

On a production deploy (after pulling new code and setting the production `.env`):

```bash
php artisan optimize         # caches config + routes + views + events in one step
php artisan migrate --force  # run pending migrations non-interactively
```

`php artisan optimize` is the inverse of `optimize:clear`; it is shorthand for
`config:cache` + `route:cache` + `view:cache` + `event:cache`.

**Whenever you change the production `.env`, rebuild the cache** or the old values
stay live:

```bash
php artisan optimize:clear   # drop stale caches
php artisan optimize         # rebuild from the new .env
```

### Quick reference

| Situation | Command |
| ----------- | --------- |
| Changed `.env` / config and it's not applying | `php artisan optimize:clear` |
| Local development (default state) | leave caches cleared / uncached |
| Production deploy | `php artisan optimize` |
| Production `.env` changed | `php artisan optimize:clear` then `php artisan optimize` |
| Routes added but 404 in prod | `php artisan route:clear` (then `route:cache`) |
| Blade/view changes not showing | `php artisan view:clear` |

---

## 7. Migrations & seeding

> **Run these against the DIRECT (non-`-pooler`) host.** Migrations fail with
> `SQLSTATE[25P02] … transaction is aborted` through the pooled endpoint — see
> [§2 Pooled vs direct endpoint](#pooled-vs-direct-endpoint--use-the-direct-host-for-migrations).
> Either set `DB_HOST` to the direct host, or prefix the command:
> `DB_HOST=ep-xxxx.<region>.aws.neon.tech php artisan migrate`.

```bash
php artisan migrate                 # apply pending migrations
php artisan migrate:status          # see what's applied
php artisan migrate --force         # non-interactive (production)
php artisan db:seed                 # run seeders
php artisan migrate:fresh --seed    # DROP all tables, re-migrate, seed (dev only!)
```

> `migrate:fresh` **drops every table** — never run it against a production Neon
> branch. Point it only at a throwaway dev branch.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --------- | ------- | ----- |
| `Inconsistent project name inferred from SNI and project option` | `DB_NEON_ENDPOINT` is set while connecting to a `-pooler` host | Set `DB_NEON_ENDPOINT=` (empty), then `php artisan optimize:clear` |
| `unsupported options startup parameter: only '-c config=val' …` | A connection URL (or other junk) was put in `DB_NEON_ENDPOINT` | Clear `DB_NEON_ENDPOINT`, then `php artisan optimize:clear` |
| `The intl PHP extension is required to use the [format] method.` | `ext-intl` not enabled | Enable `extension=intl` in `php.ini`, restart |
| `SQLSTATE[25P02] … current transaction is aborted` during `migrate` (failing statement varies between runs) | Migrating through the **pooled** (`-pooler`) host; PgBouncer transaction mode breaks DDL transactions | Run migrations against the **direct** host: `DB_HOST=ep-xxxx.<region>.aws.neon.tech php artisan migrate` |
| `SQLSTATE[0A000] … cached plan must not change result type` on normal reads (often right after adding a column) | A pooled backend holds a stale `select *` plan from before the schema change | Use the **direct** host, or recycle the Neon compute / restart the app to drop the stale pooled backends |
| `.env` change has no effect | Config is cached | `php artisan optimize:clear` |
| `could not find driver` (pgsql) | `pdo_pgsql` not enabled | Enable `extension=pdo_pgsql` in `php.ini` |
| `SQLSTATE[08006] … connection … failed` | Wrong host/credentials, or Neon compute suspended | Verify host/user/password; Neon free computes auto-suspend and resume on first connect (first hit may be slow) |

### Useful diagnostics

```bash
php artisan about                                   # environment + cache status overview
php artisan db:show --database=pgsql                # server version, table count, open connections
php artisan tinker --execute="echo DB::table('tbl_system_settings')->count();"
```

---

## 9. TL;DR

```bash
# one-time
cp .env.example .env && php artisan key:generate
#   → set the pgsql/Neon block, DB_NEON_ENDPOINT= (empty)
composer install
php artisan migrate

# run (backend API)
php artisan serve            # http://localhost:8000
# run (frontend)
pnpm dev:frontend            # http://localhost:3000  (from repo root)

# whenever .env / config seems stale
php artisan optimize:clear

# production deploy
php artisan migrate --force
php artisan optimize
```
