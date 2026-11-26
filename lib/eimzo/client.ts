/**
 * Brauzer tomoni (WebCrypto): fleshkadagi `.crt` va `.mzk` fayllarini o'qish va matnni imzolash.
 * Yopiq kalit faqat xotirada ochiladi, chiqarib olib bo'lmaydigan CryptoKey sifatida ishlatiladi
 * va hech qayerda (localStorage, IndexedDB, cookie) saqlanmaydi.
 */

type KeyFile = {
  format: 'mezon-key/v1';
  algorithm: 'ECDSA-P256';
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
  data: string;
};

/** Foydalanuvchiga ko'rsatiladigan xato (fayl yoki parol noto'g'ri). */
export class EimzoClientError extends Error {}

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const bytesToB64 = (bytes: ArrayBuffer) => {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s);
};

export function isEimzoSupported(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && !!window.crypto?.subtle;
}

export async function readCertificateFile(file: File): Promise<string> {
  const text = await file.text();
  if (text.includes('BEGIN CERTIFICATE')) return text;
  // DER (.cer) bo'lsa PEM ga o'tkaziladi
  const der = bytesToB64(await file.arrayBuffer());
  return `-----BEGIN CERTIFICATE-----\n${der.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----\n`;
}

async function readKeyFile(file: File | string): Promise<KeyFile> {
  let parsed: KeyFile;
  try {
    parsed = JSON.parse(typeof file === 'string' ? file : await file.text());
  } catch {
    throw new EimzoClientError('Kalit fayli noto‘g‘ri (.mzk fayl kerak).');
  }
  if (parsed?.format !== 'mezon-key/v1' || parsed.algorithm !== 'ECDSA-P256') {
    throw new EimzoClientError('Kalit fayli formati qo‘llab-quvvatlanmaydi.');
  }
  return parsed;
}

/**
 * Parol bilan kalitni ochadi. Natija — chiqarib olib bo'lmaydigan (extractable: false) CryptoKey:
 * uni faqat imzolash uchun ishlatish mumkin, baytlarini o'qib yoki saqlab bo'lmaydi.
 */
export async function unlockKeyFile(keyFileInput: File | string, password: string): Promise<CryptoKey> {
  const keyFile = await readKeyFile(keyFileInput);
  const subtle = window.crypto.subtle;
  const base = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const aesKey = await subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBytes(keyFile.kdf.salt), iterations: keyFile.kdf.iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  let pkcs8: ArrayBuffer;
  try {
    pkcs8 = await subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(keyFile.cipher.iv) }, aesKey, b64ToBytes(keyFile.data));
  } catch {
    throw new EimzoClientError('Kalit paroli noto‘g‘ri.');
  }
  try {
    return await subtle.importKey('pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  } finally {
    new Uint8Array(pkcs8).fill(0);
  }
}

/** Ochilgan kalit bilan matnni imzolaydi (ECDSA P-256 / SHA-256, base64 r||s). */
export async function signWithKey(privateKey: CryptoKey, message: string): Promise<string> {
  const signature = await window.crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(message)
  );
  return bytesToB64(signature);
}

/** Parol bilan kalitni ochadi va matnni imzolaydi. */
export async function signWithKeyFile(keyFileInput: File, password: string, message: string): Promise<string> {
  return signWithKey(await unlockKeyFile(keyFileInput, password), message);
}
