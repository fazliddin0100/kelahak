# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN npx prisma generate

FROM deps AS migrator
RUN apk add --no-cache postgresql-client
COPY scripts/encrypt-existing-document-content.mjs ./scripts/encrypt-existing-document-content.mjs
COPY scripts/run-migrations.sh /usr/local/bin/run-migrations.sh
RUN chmod 0755 /usr/local/bin/run-migrations.sh
CMD ["/usr/local/bin/run-migrations.sh"]

FROM alpine:3.21 AS backup
RUN apk add --no-cache restic postgresql-client tzdata
RUN mkdir -p /var/lib/mexon/staging && chown 1001:1001 /var/lib/mexon/staging
WORKDIR /opt/mexon-backup
COPY scripts/backup-once.sh /usr/local/bin/backup-once.sh
COPY scripts/backup-scheduler.sh /usr/local/bin/backup-scheduler.sh
RUN chmod 0755 /usr/local/bin/backup-once.sh /usr/local/bin/backup-scheduler.sh \
  && ln -sf /usr/share/zoneinfo/Asia/Tashkent /etc/localtime
ENV TZ=Asia/Tashkent
CMD ["/usr/local/bin/backup-scheduler.sh"]

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
RUN mkdir -p /var/lib/mexon/staging && chown -R nextjs:nodejs /var/lib/mexon

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
