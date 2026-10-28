#!/bin/sh
set -eu

baseline="20261028000000_baseline"
has_app_schema="$(psql "$DATABASE_URL" -Atqc "SELECT (to_regclass('public.users') IS NOT NULL OR to_regclass('public.documents') IS NOT NULL)::text")"
has_migration_table="$(psql "$DATABASE_URL" -Atqc "SELECT (to_regclass('public._prisma_migrations') IS NOT NULL)::text")"

if [ "$has_app_schema" = "true" ] && [ "$has_migration_table" = "false" ]; then
  diff_file="$(mktemp)"
  trap 'rm -f "$diff_file"' EXIT HUP INT TERM

  # Read-only comparison. Existing data/schema is left untouched on drift.
  ./node_modules/.bin/prisma migrate diff \
    --from-url "$DATABASE_URL" \
    --to-schema-datamodel prisma/migrations/20261028000000_baseline/schema.prisma \
    --script > "$diff_file"

  if grep -Eiq '^[[:space:]]*(CREATE|ALTER|DROP|COMMENT|GRANT|REVOKE|DO)[[:space:]]' "$diff_file"; then
    echo 'Existing database schema differs from the baseline; no schema changes were applied.' >&2
    exit 1
  fi

  ./node_modules/.bin/prisma migrate resolve --applied "$baseline"
fi

./node_modules/.bin/prisma migrate deploy
node ./scripts/encrypt-existing-document-content.mjs
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/sql/init-performance.sql
