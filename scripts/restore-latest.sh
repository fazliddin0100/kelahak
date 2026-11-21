#!/bin/sh
# Mezon: oxirgi (yoki ko'rsatilgan) restic zaxirasidan bazani va fayllarni tiklash.
# backup image ichida ishlaydi (restic + pg_restore bor). Ishlatish: scripts/restore.ps1
#
# Muhit: PGHOST PGUSER PGPASSWORD PGDATABASE RESTIC_REPOSITORY RESTIC_PASSWORD_FILE
# Ixtiyoriy: SNAPSHOT (standart: latest), UPLOADS_DIR, STAGING_DIR (yoziladigan joylar)
set -eu
umask 077

: "${PGHOST:=postgres}"
: "${PGUSER:?PGUSER kerak}"
: "${PGPASSWORD:?PGPASSWORD kerak}"
: "${PGDATABASE:?PGDATABASE kerak}"
: "${RESTIC_REPOSITORY:=/backup/restic}"
: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE kerak}"
: "${SNAPSHOT:=latest}"
export PGHOST PGUSER PGPASSWORD PGDATABASE RESTIC_REPOSITORY RESTIC_PASSWORD_FILE

echo "Zaxiralar:"
restic snapshots --compact

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT HUP INT TERM

echo "Tiklanmoqda: $SNAPSHOT"
restic restore "$SNAPSHOT" --target "$work_dir"

dump="$(find "$work_dir" -name postgres.dump -type f | head -n 1)"
[ -n "$dump" ] || { echo "Xato: zaxirada postgres.dump topilmadi" >&2; exit 1; }

echo "Baza tiklanmoqda ($PGDATABASE)..."
# pg_dump (yangi klient) Postgres 16 bilmaydigan "SET transaction_timeout" qo'shadi — olib tashlanadi
pg_restore --clean --if-exists --no-owner --no-acl --file=- "$dump" \
  | sed '/^SET transaction_timeout/d' \
  | psql --quiet --set ON_ERROR_STOP=1 --single-transaction --dbname="$PGDATABASE" >/dev/null

copy_dir() {
  src="$work_dir$1"
  dst="$2"
  if [ -n "$dst" ] && [ -d "$src" ]; then
    echo "Fayllar: $1 -> $dst"
    cp -a "$src/." "$dst/"
  fi
}
copy_dir /data/uploads "${UPLOADS_DIR:-}"
copy_dir /var/lib/mexon/staging "${STAGING_DIR:-}"

echo "Tayyor."
