import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
} from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * AES-256-GCM, application-level encryption.
 *
 * v2 (current): every record gets its own key, HKDF-SHA256(master, salt), and
 * is bound to the record it belongs to through the GCM additional data, so a
 * ciphertext copied onto another row fails authentication. The envelope names
 * the master key (`kid`) to allow key rotation.
 * v1 (legacy): master key used directly, no binding. Read-only.
 */
const ENVELOPE_MARKER = '__mexonEncryptedContent';
const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const SALT_BYTES = 16;
const TAG_BYTES = 16;
const KID_BYTES = 8;
const FILE_HEADER_V1 = Buffer.from('MXF1', 'ascii');
const FILE_HEADER_V2 = Buffer.from('MXF2', 'ascii');
const CONTENT_INFO = 'mezon/document-content/v2';
const FILE_INFO = 'mezon/document-file/v2';

type EnvelopeV1 = {
  [ENVELOPE_MARKER]: 1;
  algorithm: 'aes-256-gcm';
  iv: string;
  tag: string;
  data: string;
};

type EnvelopeV2 = {
  [ENVELOPE_MARKER]: 2;
  algorithm: 'aes-256-gcm';
  kid: string;
  salt: string;
  iv: string;
  tag: string;
  data: string;
};

export type EncryptedContentEnvelope = EnvelopeV1 | EnvelopeV2;

type MasterKey = { kid: string; key: Buffer };

let keyring: { primary: MasterKey; byKid: Map<string, MasterKey> } | undefined;

function loadKeyFile(keyPath: string): MasterKey {
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

  const key = Buffer.from(rawKey, 'hex');
  if (key.length !== KEY_BYTES) {
    throw new Error('Ilova shifrlash kalitining uzunligi noto‘g‘ri.');
  }
  const kid = createHash('sha256')
    .update('mezon-key-id')
    .update(key)
    .digest('hex')
    .slice(0, KID_BYTES * 2);
  return { kid, key };
}

/**
 * APP_ENCRYPTION_KEY_FILE — joriy kalit (yangi yozuvlar shu bilan shifrlanadi).
 * APP_ENCRYPTION_PREVIOUS_KEY_FILES — vergul bilan ajratilgan eski kalit
 * fayllari; faqat o‘qish uchun (kalit almashtirilganda).
 */
function getKeyring() {
  if (keyring) return keyring;

  const primary = loadKeyFile(
    process.env.APP_ENCRYPTION_KEY_FILE ??
      path.join(process.cwd(), 'secrets', 'app-encryption-key')
  );
  const byKid = new Map<string, MasterKey>([[primary.kid, primary]]);

  for (const previousPath of (process.env.APP_ENCRYPTION_PREVIOUS_KEY_FILES ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)) {
    const previous = loadKeyFile(previousPath);
    if (!byKid.has(previous.kid)) byKid.set(previous.kid, previous);
  }

  keyring = { primary, byKid };
  return keyring;
}

function keyForKid(kid: string): MasterKey {
  const master = getKeyring().byKid.get(kid);
  if (!master) {
    throw new Error(
      `Shifrlash kaliti topilmadi (kid=${kid}). Eski kalit faylini APP_ENCRYPTION_PREVIOUS_KEY_FILES ga qo‘shing.`
    );
  }
  return master;
}

function deriveRecordKey(master: Buffer, salt: Buffer, info: string): Buffer {
  return Buffer.from(hkdfSync('sha256', master, salt, info, KEY_BYTES));
}

function requireContext(kind: 'doc' | 'file', id: string): Buffer {
  if (!id) throw new Error('Shifrlash uchun yozuv identifikatori kerak.');
  return Buffer.from(`${kind}:${id}`, 'utf8');
}

export function isEncryptedDocumentContent(
  value: unknown
): value is EncryptedContentEnvelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const envelope = value as Record<string, unknown>;
  const version = envelope[ENVELOPE_MARKER];
  if (
    envelope.algorithm !== 'aes-256-gcm' ||
    typeof envelope.iv !== 'string' ||
    typeof envelope.tag !== 'string' ||
    typeof envelope.data !== 'string'
  ) {
    return false;
  }
  if (version === 1) return true;
  return (
    version === 2 &&
    typeof envelope.kid === 'string' &&
    typeof envelope.salt === 'string'
  );
}

export function encryptDocumentContent(
  value: unknown,
  documentId: string
): EnvelopeV2 {
  const { primary } = getKeyring();
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(
    'aes-256-gcm',
    deriveRecordKey(primary.key, salt, CONTENT_INFO),
    iv
  );
  cipher.setAAD(requireContext('doc', documentId));
  const plaintext = Buffer.from(JSON.stringify(value ?? null), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    [ENVELOPE_MARKER]: 2,
    algorithm: 'aes-256-gcm',
    kid: primary.kid,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64'),
  };
}

export function decryptDocumentContent(
  value: unknown,
  documentId: string
): unknown {
  if (!isEncryptedDocumentContent(value)) return value;
  if (value[ENVELOPE_MARKER] === 1) return decryptLegacyContent(value);

  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveRecordKey(
      keyForKid(value.kid).key,
      Buffer.from(value.salt, 'base64'),
      CONTENT_INFO
    ),
    Buffer.from(value.iv, 'base64')
  );
  decipher.setAAD(requireContext('doc', documentId));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));

  let plaintext: string;
  try {
    plaintext = Buffer.concat([
      decipher.update(Buffer.from(value.data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('Hujjat matnini ochib bo‘lmadi (yaxlitlik tekshiruvi o‘tmadi).');
  }
  return JSON.parse(plaintext) as unknown;
}

/** v1 yozuvlarida kalit identifikatori yo‘q — mavjud kalitlar navbat bilan sinab ko‘riladi */
function legacyKeys(): Buffer[] {
  const { primary, byKid } = getKeyring();
  return [
    primary.key,
    ...[...byKid.values()]
      .filter((master) => master.kid !== primary.kid)
      .map((master) => master.key),
  ];
}

function decryptLegacyContent(value: EnvelopeV1): unknown {
  for (const key of legacyKeys()) {
    let plaintext: string;
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(value.iv, 'base64')
      );
      decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
      plaintext = Buffer.concat([
        decipher.update(Buffer.from(value.data, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      continue;
    }
    return JSON.parse(plaintext) as unknown;
  }
  throw new Error('Hujjat matnini ochib bo‘lmadi (yaxlitlik tekshiruvi o‘tmadi).');
}

/** MXF2 | kid(8) | salt(16) | iv(12) | tag(16) | ciphertext */
export function encryptDocumentFile(value: Buffer, fileId: string): Buffer {
  const { primary } = getKeyring();
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(
    'aes-256-gcm',
    deriveRecordKey(primary.key, salt, FILE_INFO),
    iv
  );
  cipher.setAAD(requireContext('file', fileId));
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([
    FILE_HEADER_V2,
    Buffer.from(primary.kid, 'hex'),
    salt,
    iv,
    cipher.getAuthTag(),
    encrypted,
  ]);
}

function decryptFileV1(value: Buffer): Buffer {
  const ivStart = FILE_HEADER_V1.length;
  const tagStart = ivStart + NONCE_BYTES;
  const dataStart = tagStart + TAG_BYTES;
  if (value.length < dataStart) {
    throw new Error('Faylning shifrlangan formati noto‘g‘ri.');
  }

  for (const key of legacyKeys()) {
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        value.subarray(ivStart, tagStart)
      );
      decipher.setAuthTag(value.subarray(tagStart, dataStart));
      return Buffer.concat([
        decipher.update(value.subarray(dataStart)),
        decipher.final(),
      ]);
    } catch {
      // keyingi kalit
    }
  }
  throw new Error('Faylni ochib bo‘lmadi (yaxlitlik tekshiruvi o‘tmadi).');
}

export function decryptDocumentFile(value: Buffer, fileId: string): Buffer {
  const header = value.subarray(0, FILE_HEADER_V2.length);
  if (header.equals(FILE_HEADER_V1)) return decryptFileV1(value);

  const kidStart = FILE_HEADER_V2.length;
  const saltStart = kidStart + KID_BYTES;
  const ivStart = saltStart + SALT_BYTES;
  const tagStart = ivStart + NONCE_BYTES;
  const dataStart = tagStart + TAG_BYTES;
  if (!header.equals(FILE_HEADER_V2) || value.length < dataStart) {
    throw new Error('Faylning shifrlangan formati noto‘g‘ri.');
  }

  const master = keyForKid(value.subarray(kidStart, saltStart).toString('hex'));
  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveRecordKey(master.key, value.subarray(saltStart, ivStart), FILE_INFO),
    value.subarray(ivStart, tagStart)
  );
  decipher.setAAD(requireContext('file', fileId));
  decipher.setAuthTag(value.subarray(tagStart, dataStart));
  try {
    return Buffer.concat([
      decipher.update(value.subarray(dataStart)),
      decipher.final(),
    ]);
  } catch {
    throw new Error('Faylni ochib bo‘lmadi (yaxlitlik tekshiruvi o‘tmadi).');
  }
}
