import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { encryptDocumentFile } from '@/lib/documentContentEncryption';
import { prisma } from '@/lib/prisma';

export const SESSION_IDLE_MS = 30 * 60 * 1000;
const stagingRoot = process.env.FILE_STAGING_DIR ?? '/var/lib/mexon/staging';
let lastSweepAt = 0;

export async function createUserSession(userId: string, lifetimeMs: number) {
  const id = randomUUID();
  const now = new Date();
  await prisma.userSession.create({
    data: { id, userId, createdAt: now, lastActivityAt: now, expiresAt: new Date(now.getTime() + lifetimeMs) },
  });
  return id;
}

async function finalizeSession(sessionId: string) {
  await prisma.userSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  const uploads = await prisma.pendingUpload.findMany({
    where: { sessionId },
    include: { file: true },
  });
  for (const upload of uploads) {
    const encryptedContent = await readFile(upload.storagePath);
    await prisma.$transaction([
      prisma.file.update({
        where: { id: upload.fileId },
        data: { encryptedContent, filePath: null },
      }),
      prisma.pendingUpload.delete({ where: { id: upload.id } }),
    ]);
    await unlink(upload.storagePath).catch(() => undefined);
  }
}

export async function finalizeUserSession(sessionId: string) {
  await finalizeSession(sessionId);
}

export async function touchUserSession(sessionId: string, userId: string) {
  const now = new Date();
  await sweepExpiredSessions();
  const active = await prisma.userSession.findFirst({
    where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: now } },
    select: { id: true },
  });
  if (!active) return false;
  await prisma.userSession.updateMany({
    where: { id: sessionId, lastActivityAt: { lte: new Date(now.getTime() - 60_000) } },
    data: { lastActivityAt: now },
  });

  return true;
}

export async function sweepExpiredSessions() {
  if (Date.now() - lastSweepAt < 60_000) return;
  lastSweepAt = Date.now();
  const now = new Date();
  const stale = await prisma.userSession.findMany({
    where: {
      OR: [
        { revokedAt: null, OR: [{ expiresAt: { lte: now } }, { lastActivityAt: { lte: new Date(now.getTime() - SESSION_IDLE_MS) } }] },
        { revokedAt: { not: null }, pendingUploads: { some: {} } },
      ],
    },
    select: { id: true },
    take: 100,
  });
  for (const session of stale) await finalizeSession(session.id);
}

export async function stageEncryptedUpload(sessionId: string, bytes: Buffer) {
  const directory = path.join(stagingRoot, sessionId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const storagePath = path.join(directory, `${randomUUID()}.mxf`);
  await writeFile(storagePath, encryptDocumentFile(bytes), { mode: 0o600, flag: 'wx' });
  return storagePath;
}

export async function readEncryptedStagedFile(storagePath: string) {
  return readFile(storagePath);
}
