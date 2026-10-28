import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ENVELOPE_MARKER = '__mexonEncryptedContent';
const ENVELOPE_VERSION = 1;
const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const FILE_ENVELOPE_HEADER = Buffer.from('MXF1', 'ascii');

type EncryptedContentEnvelope = {
  [ENVELOPE_MARKER]: 1;
  algorithm: 'aes-256-gcm';
  iv: string;
  tag: string;
  data: string;
};

let cachedKey: Buffer | undefined;

function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const keyPath =
    process.env.APP_ENCRYPTION_KEY_FILE ??
    path.join(process.cwd(), 'secrets', 'app-encryption-key');
  let rawKey: string;
  try {
    rawKey = readFileSync(keyPath, 'utf8').trim();
  } catch {
    throw new Error(
      `Ilova shifrlash kaliti o‘qilmadi (${keyPath}). Docker secret yoki secrets/app-encryption-key faylini sozlang.`
    );
  }

  if (!/^[a-f\d]{64}$/i.test(rawKey)) {
    throw new Error('Ilova shifrlash kaliti 32 bayt (64 hex belgi) bo‘lishi kerak.');
  }

  cachedKey = Buffer.from(rawKey, 'hex');
  if (cachedKey.length !== KEY_BYTES) {
    throw new Error('Ilova shifrlash kalitining uzunligi noto‘g‘ri.');
  }
  return cachedKey;
}

export function isEncryptedDocumentContent(
  value: unknown
): value is EncryptedContentEnvelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const envelope = value as Partial<EncryptedContentEnvelope>;
  return (
    envelope[ENVELOPE_MARKER] === ENVELOPE_VERSION &&
    envelope.algorithm === 'aes-256-gcm' &&
    typeof envelope.iv === 'string' &&
    typeof envelope.tag === 'string' &&
    typeof envelope.data === 'string'
  );
}

export function encryptDocumentContent(value: unknown): EncryptedContentEnvelope {
  if (isEncryptedDocumentContent(value)) {
    return value;
  }

  const iv = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    [ENVELOPE_MARKER]: ENVELOPE_VERSION,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64'),
  };
}

export function decryptDocumentContent(value: unknown): unknown {
  if (!isEncryptedDocumentContent(value)) return value;

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(value.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.data, 'base64')),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(plaintext) as unknown;
}

export function encryptDocumentFile(value: Buffer): Buffer {
  const iv = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([
    FILE_ENVELOPE_HEADER,
    iv,
    cipher.getAuthTag(),
    encrypted,
  ]);
}

export function decryptDocumentFile(value: Buffer): Buffer {
  const minimumLength = FILE_ENVELOPE_HEADER.length + NONCE_BYTES + 16;
  if (
    value.length < minimumLength ||
    !value.subarray(0, FILE_ENVELOPE_HEADER.length).equals(FILE_ENVELOPE_HEADER)
  ) {
    throw new Error('Faylning shifrlangan formati noto‘g‘ri.');
  }

  const ivStart = FILE_ENVELOPE_HEADER.length;
  const tagStart = ivStart + NONCE_BYTES;
  const dataStart = tagStart + 16;
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    value.subarray(ivStart, tagStart)
  );
  decipher.setAuthTag(value.subarray(tagStart, dataStart));
  return Buffer.concat([
    decipher.update(value.subarray(dataStart)),
    decipher.final(),
  ]);
}
