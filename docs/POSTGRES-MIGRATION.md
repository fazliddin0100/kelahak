# PostgreSQL deployment

Mezon uses PostgreSQL as its only database. Prisma owns the schema and data access.

## Local development

Stop any existing development server, then run:

```bash
npm run dev
```

The command generates Prisma Client, checks the PostgreSQL connection and baseline, backs up existing data before pending migrations, applies migrations and encryption, then starts Next.js. Set `DATABASE_URL` in `.env` and keep `secrets/app-encryption-key` available.

## Ubuntu production behind Nginx

Use `npm run docker:prod` after configuring `.env.production.local`, Docker secrets, and the mounted backup destination. Compose runs the backup and migration services before the application container. Configure Nginx to proxy to the published application port.

See [offline-deployment.md](offline-deployment.md) for LAN backup, restore, secret handling, and offline image transfer instructions.
