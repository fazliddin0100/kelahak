/**
 * E-IMZO kaliti va sertifikat so'rovi (PKCS#10 CSR) — brauzerda (WebCrypto), tashqi paketsiz.
 * CA oflayn: server hech narsa imzolamaydi. .csr oflayn CA kompyuterida
 * `scripts/pki/sign-csr.sh` bilan imzolanadi, tayyor .crt panelga yuklanadi.
 *
 * Kalit fayli formati (.mzk) scripts/pki/make-key-file.mjs bilan bir xil:
 * PKCS#8 -> PBKDF2-SHA256 (600 000) -> AES-256-GCM.
 */

const KDF_ITERATIONS = 600_000;

// ─── DER (ASN.1) kodlash ────────────────────────────────────────────────────

type Bytes = Uint8Array<ArrayBuffer>;

function derLength(n: number): number[] {
  if (n < 0x80) return [n];
  const bytes: number[] = [];
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n >>= 8;
  }
  return [0x80 | bytes.length, ...bytes];
}

function tlv(tag: number, content: Uint8Array): Bytes {
  return new Uint8Array([tag, ...derLength(content.length), ...content]);
}

function concat(...parts: Uint8Array[]): Bytes {
  const out: Bytes = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

const seq = (...items: Uint8Array[]) => tlv(0x30, concat(...items));
const set = (...items: Uint8Array[]) => tlv(0x31, concat(...items));
const utf8String = (s: string) => tlv(0x0c, new TextEncoder().encode(s));
const printableString = (s: string) => tlv(0x13, new TextEncoder().encode(s));

function oid(dotted: string): Bytes {
  const parts = dotted.split('.').map(Number);
  const bytes = [40 * parts[0] + parts[1]];
  for (const value of parts.slice(2)) {
    const chunk: number[] = [value & 0x7f];
    let v = Math.floor(value / 128);
    while (v > 0) {
      chunk.unshift((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    bytes.push(...chunk);
  }
  return tlv(0x06, new Uint8Array(bytes));
}

/** Ishorasiz katta sonni DER INTEGER ga (boshidagi nollar olib tashlanadi, kerak bo'lsa 0x00). */
function derUnsignedInteger(bytes: Uint8Array): Bytes {
  let i = 0;
  while (i < bytes.length - 1 && bytes[i] === 0) i++;
  let body: Uint8Array = bytes.slice(i);
  if (body[0] & 0x80) body = concat(new Uint8Array([0]), body);
  return tlv(0x02, body);
}

const OID = {
  commonName: '2.5.4.3',
  organization: '2.5.4.10',
  userId: '0.9.2342.19200300.100.1.1', // UID — login
  serialNumber: '2.5.4.5', // kompyuter MAC manzili (AA-BB-CC-DD-EE-FF)
  ecdsaWithSha256: '1.2.840.10045.4.3.2',
};

function rdn(type: string, value: string): Bytes {
  return set(seq(oid(type), utf8String(value)));
}

// ─── Kodlash yordamchilari ──────────────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function pem(label: string, der: Uint8Array): string {
  const body = toBase64(der).match(/.{1,64}/g)?.join('\n') ?? '';
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`;
}

// ─── Ommaviy API ────────────────────────────────────────────────────────────

export type KeyRequestInput = {
  login: string;
  fullName: string;
  organization: string;
  /** Ro'yxatdan o'tgan kompyuter MAC manzili (normalizeMac bilan tekshirilgan) */
  mac?: string;
  password: string;
};

export type KeyRequestResult = {
  /** Userning fleshkasiga: parol bilan shifrlangan yopiq kalit */
  keyFileJson: string;
  /** Oflayn CA ga: sertifikat so'rovi (PEM) */
  csrPem: string;
  /** Ochiq kalit barmoq izi (SHA-256, hex) — CA operatori solishtirishi uchun */
  publicKeySha256: string;
};

export async function createKeyAndCsr(input: KeyRequestInput): Promise<KeyRequestResult> {
  const subtle = globalThis.crypto.subtle;
  const keyPair = (await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;

  const spki = new Uint8Array(await subtle.exportKey('spki', keyPair.publicKey));

  // CertificationRequestInfo: version 0, subject, subjectPKInfo, attributes [0] {}
  const subject = seq(
    rdn(OID.commonName, input.fullName),
    rdn(OID.userId, input.login),
    rdn(OID.organization, input.organization),
    ...(input.mac ? [set(seq(oid(OID.serialNumber), printableString(input.mac)))] : [])
  );
  const info = seq(tlv(0x02, new Uint8Array([0])), subject, spki, new Uint8Array([0xa0, 0x00]));

  // WebCrypto ECDSA imzosi r||s (64 bayt) — CSR uchun DER SEQUENCE{INTEGER r, INTEGER s}
  const raw = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keyPair.privateKey, info));
  const sigDer = seq(derUnsignedInteger(raw.slice(0, 32)), derUnsignedInteger(raw.slice(32)));
  const csr = seq(info, seq(oid(OID.ecdsaWithSha256)), tlv(0x03, concat(new Uint8Array([0]), sigDer)));

  // Yopiq kalit: PKCS#8 -> parol bilan AES-256-GCM
  const pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', keyPair.privateKey));
  try {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const base = await subtle.importKey('raw', new TextEncoder().encode(input.password), 'PBKDF2', false, ['deriveKey']);
    const aesKey = await subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: KDF_ITERATIONS, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    const data = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, pkcs8));
    const keyFile = {
      format: 'mezon-key/v1',
      algorithm: 'ECDSA-P256',
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: KDF_ITERATIONS, salt: toBase64(salt) },
      cipher: { name: 'AES-GCM', iv: toBase64(iv) },
      data: toBase64(data),
    };
    const fp = new Uint8Array(await subtle.digest('SHA-256', spki));
    return {
      keyFileJson: JSON.stringify(keyFile, null, 2),
      csrPem: pem('CERTIFICATE REQUEST', csr),
      publicKeySha256: [...fp].map((b) => b.toString(16).padStart(2, '0')).join(''),
    };
  } finally {
    pkcs8.fill(0);
  }
}
