import { createCipheriv, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';

const marker = '__mexonEncryptedContent';
const keyPath =
  process.env.APP_ENCRYPTION_KEY_FILE ?? '/run/secrets/app_encryption_key';
const keyHex = readFileSync(keyPath, 'utf8').trim();
if (!/^[a-f\d]{64}$/i.test(keyHex)) {
  throw new Error('APP encryption secret must contain exactly 32 bytes as hex.');
}
const key = Buffer.from(keyHex, 'hex');
const prisma = new PrismaClient();

function isEncrypted(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value[marker] === 1
  );
}

function encrypt(value) {
  if (isEncrypted(value)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    [marker]: 1,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}

function encryptFile(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([
    Buffer.from('MXF1', 'ascii'),
    iv,
    cipher.getAuthTag(),
    encrypted,
  ]);
}

async function encryptLegacyUploads() {
  const uploadsRoot = path.resolve(
    process.env.LEGACY_UPLOADS_DIR ?? '/data/uploads'
  );
  let total = 0;

  while (true) {
    const rows = await prisma.$queryRaw`
      SELECT id, "filePath", "encryptedContent"
      FROM files
      WHERE "filePath" IS NOT NULL
      ORDER BY id
      LIMIT 100
    `;
    if (rows.length === 0) break;

    for (const row of rows) {
      const storedPath = String(row.filePath);
      const relativePath = storedPath.replace(/^\/?uploads\//i, '');
      const sourcePath = path.resolve(uploadsRoot, relativePath);
      if (
        !relativePath ||
        !sourcePath.startsWith(`${uploadsRoot}${path.sep}`)
      ) {
        throw new Error(`Unsafe legacy upload path for file ${row.id}.`);
      }

      const encryptedContent = row.encryptedContent
        ? row.encryptedContent
        : encryptFile(readFileSync(sourcePath));
      await prisma.file.update({
        where: { id: row.id },
        data: {
          encryptedContent,
          filePath: null,
          mimeType: 'application/octet-stream',
        },
      });
      if (existsSync(sourcePath)) unlinkSync(sourcePath);
      total += 1;
    }
  }

  console.info(`Encrypted ${total} existing uploaded files.`);
}

try {
  let total = 0;
  while (true) {
    const rows = await prisma.$queryRaw`
      SELECT "documentId", content
      FROM document_contents
      WHERE content->>'__mexonEncryptedContent' IS DISTINCT FROM '1'
      ORDER BY "documentId"
      LIMIT 250
    `;
    if (rows.length === 0) break;

    const writes = rows.map((row) =>
      prisma.documentContent.update({
        where: { documentId: row.documentId },
        data: { content: encrypt(row.content) },
      })
    );
    await prisma.$transaction(writes);
    total += rows.length;
  }

  console.info(`Encrypted ${total} existing document content rows.`);
  await encryptLegacyUploads();
} finally {
  await prisma.$disconnect();
}
