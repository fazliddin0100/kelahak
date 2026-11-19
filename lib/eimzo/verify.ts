import { verify as verifySignatureRaw, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Mezon E-IMZO (ichki PKI) sertifikatlarini tekshirish.
 * Faqat Node'ning o'z crypto moduli: X.509 + ECDSA P-256 / SHA-256.
 * Ishonchli CA: EIMZO_CA_CERT_FILE yoki secrets/pki/ca.crt (faqat ochiq sertifikat).
 */

const CLIENT_AUTH_EKU = '1.3.6.1.5.5.7.3.2';
const MAX_PEM_LENGTH = 16 * 1024;

export class EimzoError extends Error {
  constructor(
    message: string,
    public code:
      | 'CA_MISSING'
      | 'BAD_CERT'
      | 'UNTRUSTED'
      | 'EXPIRED'
      | 'NOT_YET_VALID'
      | 'BAD_KEY'
      | 'BAD_USAGE'
      | 'BAD_SIGNATURE'
  ) {
    super(message);
  }
}

let caCache: { file: string; cert: X509Certificate } | undefined;

function caFile(): string {
  return process.env.EIMZO_CA_CERT_FILE || path.join(/*turbopackIgnore: true*/ process.cwd(), 'secrets', 'pki', 'ca.crt');
}

export function loadTrustedCa(): X509Certificate {
  const file = caFile();
  if (caCache?.file === file) return caCache.cert;
  let pem: string;
  try {
    pem = readFileSync(file, 'utf8');
  } catch {
    throw new EimzoError(
      'Serverda ishonchli CA sertifikati sozlanmagan (secrets/pki/ca.crt).',
      'CA_MISSING'
    );
  }
  const cert = new X509Certificate(pem);
  if (!cert.ca) {
    throw new EimzoError('EIMZO_CA_CERT_FILE CA sertifikati emas.', 'CA_MISSING');
  }
  caCache = { file, cert };
  return cert;
}

export function isEimzoConfigured(): boolean {
  try {
    loadTrustedCa();
    return true;
  } catch {
    return false;
  }
}

export type ParsedCertificate = {
  cert: X509Certificate;
  fingerprint256: string;
  serialNumber: string;
  subject: string;
  issuer: string;
  notBefore: Date;
  notAfter: Date;
  pem: string;
  /** Sertifikatdagi UID (login) va CN (F.I.Sh) */
  uid: string | null;
  commonName: string | null;
};

function subjectField(subject: string, name: string): string | null {
  for (const line of subject.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && line.slice(0, i).trim() === name) return line.slice(i + 1).trim();
  }
  return null;
}

/**
 * PEM sertifikatni o'qiydi va CA tomonidan berilganini, muddatini, kalit turini va
 * ishlatilishini tekshiradi. Bazadagi holat (bekor qilinganmi) alohida tekshiriladi.
 */
export function parseAndValidateCertificate(pemInput: unknown, now = new Date()): ParsedCertificate {
  if (typeof pemInput !== 'string' || pemInput.length > MAX_PEM_LENGTH || !pemInput.includes('BEGIN CERTIFICATE')) {
    throw new EimzoError('Sertifikat fayli noto‘g‘ri (PEM .crt kerak).', 'BAD_CERT');
  }
  let cert: X509Certificate;
  try {
    cert = new X509Certificate(pemInput);
  } catch {
    throw new EimzoError('Sertifikatni o‘qib bo‘lmadi.', 'BAD_CERT');
  }

  const ca = loadTrustedCa();
  if (cert.ca) throw new EimzoError('Bu CA sertifikati, foydalanuvchi sertifikati emas.', 'BAD_USAGE');
  // cert.checkIssued(ca): "cert ni ca bergan" (DN va kalit identifikatorlari mos), verify: imzo haqiqiy
  if (!cert.checkIssued(ca) || !cert.verify(ca.publicKey)) {
    throw new EimzoError('Sertifikat tizimning sertifikat markazi tomonidan berilmagan.', 'UNTRUSTED');
  }

  const notBefore = new Date(cert.validFrom);
  const notAfter = new Date(cert.validTo);
  if (now < notBefore) throw new EimzoError('Sertifikat hali amal qilmaydi.', 'NOT_YET_VALID');
  if (now > notAfter) throw new EimzoError('Sertifikat muddati tugagan.', 'EXPIRED');

  const key = cert.publicKey;
  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
    throw new EimzoError('Faqat EC P-256 kalitli sertifikatlar qabul qilinadi.', 'BAD_KEY');
  }
  const eku = cert.keyUsage;
  if (Array.isArray(eku) && eku.length > 0 && !eku.includes(CLIENT_AUTH_EKU)) {
    throw new EimzoError('Sertifikat tizimga kirish uchun mo‘ljallanmagan.', 'BAD_USAGE');
  }

  const pem = cert.toString();
  return {
    cert,
    fingerprint256: cert.fingerprint256,
    serialNumber: cert.serialNumber,
    subject: cert.subject,
    issuer: cert.issuer,
    notBefore,
    notAfter,
    pem,
    uid: subjectField(cert.subject, 'UID'),
    commonName: subjectField(cert.subject, 'CN'),
  };
}

/** Brauzer WebCrypto imzosi: ECDSA P-256, SHA-256, r||s (64 bayt, base64). */
export function verifyEimzoSignature(cert: X509Certificate, message: string, signatureB64: unknown): void {
  if (typeof signatureB64 !== 'string' || signatureB64.length > 200) {
    throw new EimzoError('Imzo noto‘g‘ri.', 'BAD_SIGNATURE');
  }
  const signature = Buffer.from(signatureB64, 'base64');
  const ok =
    signature.length === 64 &&
    verifySignatureRaw(
      'sha256',
      Buffer.from(message, 'utf8'),
      { key: cert.publicKey, dsaEncoding: 'ieee-p1363' },
      signature
    );
  if (!ok) throw new EimzoError('Imzo tasdiqlanmadi: kalit sertifikatga mos emas.', 'BAD_SIGNATURE');
}
