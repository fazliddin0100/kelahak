# Mezon: offline deploy and backup

## First setup

1. Copy `.env.example` to `.env.production.local` and replace every `CHANGE_ME` value with a unique secret.
2. Keep `secrets/app-encryption-key` and `secrets/backup-repository-password`. These files are deliberately excluded from Git and Docker build images. Never regenerate the application key after encrypted document content exists.
3. Internet access is not required; the app, database, and backups can run on the local network. Set `BACKUP_PATH` to a host path mounted from a separate LAN NAS/computer or to a removable drive. For a NAS, mount its share on the host first (for example `/mnt/mezon-nas` on Linux or a Docker-accessible drive such as `Z:/MezonBackups` on Windows), then point `BACKUP_PATH` there. Create an empty `.mexon-backup-target` marker in the target folder; backups refuse to run without it, so a missing mount cannot silently fall back to a folder on the application disk.
4. Start the stack with `npm run docker:prod` when building on this machine. On an offline machine, load `mezon-docker-images.tar` with `docker load -i mezon-docker-images.tar`, copy the secret files securely, create `.env.production.local`, then run `npm run docker:offline`.

The production stack takes an encrypted pre-migration database/upload snapshot, applies Prisma migrations, encrypts existing document content, and only then starts the application. A separate container makes a backup when it starts and every day at 02:00 Tashkent time. Restic keeps 30 daily, 12 weekly, and 12 monthly snapshots. Backups include PostgreSQL, the legacy upload volume, and encrypted session staging files; they do not include `.env.production.local` or Docker secret files.

## Database migrations

`npx prisma generate` updates the client only; it does not create PostgreSQL tables. Stop any currently running Next.js dev process first, then use `npm run dev` for local development: it generates the client, checks connectivity and baseline drift, takes an AES-256-GCM encrypted `pg_dump` backup before pending migrations, applies migrations and data encryption, applies the idempotent performance SQL, and starts Next.js only after all steps succeed. It stops without changing the schema if the DB differs from the saved baseline or the required backup/key/tool is missing. Backup files are written under `backups/dev-migrations` by default; restore a database dump with `node scripts/decrypt-dev-backup.mjs <snapshot>/database.dump.mxd <restore.dump`, then `pg_restore` it into a stopped target database. Encrypted legacy uploads are under the same snapshot’s `uploads/` folder.

For Ubuntu behind Nginx, the production Compose stack runs the baseline check, encrypted pre-migration Restic snapshot, pending Prisma migrations, data encryption, and app startup in order. If running directly on Ubuntu without Compose, install Node.js dependencies and PostgreSQL client tools, take a verified backup, set `DATABASE_URL` and `APP_ENCRYPTION_KEY_FILE`, then run `sh scripts/run-migrations.sh` before starting Next.js. Do not start against a database where migrations have not completed; login and encrypted uploads require the new tables.

## Offline backup safety

Restic encrypts the repository with `secrets/backup-repository-password`. Application-level document encryption uses the separate `secrets/app-encryption-key`. Keep secure copies of both secrets separately from the backup disk. Without the Restic password the snapshots cannot be opened; without the application key encrypted document text cannot be decrypted.

For protection against disk failure or ransomware, back up to a separate LAN NAS/computer and also rotate two removable drives for an offline copy. Put the marker file on each target. Keep one removable drive disconnected and stored separately. With LAN-only operation, the NAS backup works without internet; the disconnected drive protects against network-wide malware, theft, and hardware damage.

## Inspect and restore a snapshot

Uploaded files are encrypted before entering the session staging volume. Explicit logout finalizes them into encrypted database records. If the browser closes without logout, an app worker finalizes the upload after 30 minutes without activity. Document text is encrypted on every save so permitted recipients can still read it.

List snapshots:

```powershell
docker compose --env-file .env.production.local -f docker-compose.prod.yml run --rm backup restic snapshots
```

Check repository integrity:

```powershell
docker compose --env-file .env.production.local -f docker-compose.prod.yml run --rm backup restic check
```

To restore, first stop the app, restore the selected snapshot to a separate directory, and inspect the dump before replacing database contents:

```powershell
docker compose --env-file .env.production.local -f docker-compose.prod.yml stop app
docker compose --env-file .env.production.local -f docker-compose.prod.yml run --rm -v "${PWD}/restore:/restore" backup restic restore latest --target /restore
```

The dump and uploads are restored under the paths captured by Restic. Restore the PostgreSQL dump with `pg_restore` only after confirming the target database and taking a current backup. Do not restore a dump over a running application.
