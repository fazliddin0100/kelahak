#!/bin/sh
set -eu
umask 077

: "${PGHOST:=postgres}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER must be set}"
: "${PGPASSWORD:?PGPASSWORD must be set}"
: "${PGDATABASE:?PGDATABASE must be set}"
: "${RESTIC_REPOSITORY:=/backup/restic}"
: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE must be set}"
export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE RESTIC_REPOSITORY RESTIC_PASSWORD_FILE

if [ ! -f /backup/.mexon-backup-target ]; then
  echo 'External backup drive is not mounted or lacks .mexon-backup-target; refusing to write.' >&2
  exit 1
fi
test -r "$RESTIC_PASSWORD_FILE"
mkdir -p "$RESTIC_REPOSITORY"
if ! restic snapshots >/dev/null 2>&1; then
  restic init
fi

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT HUP INT TERM
pg_dump --format=custom --no-owner --no-acl --file="$work_dir/postgres.dump"

backup_paths="$work_dir/postgres.dump"
if [ -d /data/uploads ]; then
  backup_paths="$backup_paths /data/uploads"
fi
if [ -d /var/lib/mexon/staging ]; then
  backup_paths="$backup_paths /var/lib/mexon/staging"
fi

# Word splitting is intentional so Restic receives each path as an argument.
# shellcheck disable=SC2086
restic backup --tag mexon --tag database-uploads-and-encrypted-staging $backup_paths
restic forget --keep-daily 30 --keep-weekly 12 --keep-monthly 12 --prune
