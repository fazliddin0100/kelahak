import { createHash, createPublicKey, X509Certificate, verify as verifyRaw } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { createDbId, findDocumentById } from '@/lib/db/document';
import { consumeChallenge, isAllowedOrigin } from '@/lib/eimzo/challenge';
import { DeviceError, verifyDeviceAttestation } from '@/lib/eimzo/device';
import { EimzoError, parseAndValidateCertificate, verifyEimzoSignature } from '@/lib/eimzo/verify';
import connectToDatabase, { prisma } from '@/lib/prisma';

/**
 * Hujjatni E-IMZO bilan imzolash.
 * Imzolanadigan matn: `mezon-sign|v1|{hujjatId}|{mazmun xeshi}|{challengeId}|{nonce}|{origin}`.
 * Mazmun xeshi — sarlavha, grif, matn va ilovalarning barqaror JSON ko'rinishidan SHA-256.
 */

const HASH_VERSION = 1;

/** Kalitlar tartibi barqaror JSON (bir xil mazmun har doim bir xil xesh beradi). */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

/** Hujjatning joriy mazmuni xeshi (hex). Hujjat topilmasa null. */
export async function computeDocumentHash(documentId: string): Promise<string | null> {
  const doc = await findDocumentById(documentId, { includeContent: true, includeAttachments: true });
  if (!doc) return null;
  const canonical = {
    v: HASH_VERSION,
    id: doc.id,
    title: doc.title ?? '',
    grif: doc.grif ?? '',
    content: doc.content?.content ?? null,
    attachments: (doc.attachments ?? []).map((a) => a.attachmentId).sort(),
  };
  return createHash('sha256').update(stableStringify(canonical), 'utf8').digest('hex');
}

export function documentSignMessage(p: {
  documentId: string;
  contentHash: string;
  challengeId: string;
  nonce: string;
  origin: string;
}): string {
  return `mezon-sign|v${HASH_VERSION}|${p.documentId}|${p.contentHash}|${p.challengeId}|${p.nonce}|${p.origin}`;
}

export type VerifiedDocumentSignature = {
  certificateId: string;
  fingerprint256: string;
  contentHash: string;
  signature: string;
  signedMessage: string;
  /** Mezon agenti tasdig'i (kompyuter) — bo'lsa */
  device: { deviceId: string; message: string; signature: string; registered: boolean } | null;
};

export class DocumentSignError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}

/**
 * /signed so'rovidagi E-IMZO ma'lumotini tekshiradi. Muvaffaqiyatli bo'lsa,
 * imzoni saqlash uchun kerakli ma'lumotlarni qaytaradi (saqlash — imzo qoidalari o'tgach).
 */
export async function verifyDocumentSignRequest(
  request: NextRequest,
  userId: string,
  documentId: string,
  eimzo: unknown
): Promise<VerifiedDocumentSignature> {
  const e = (eimzo ?? {}) as Record<string, unknown>;
  if (typeof e.challengeId !== 'string' || !e.challengeId) {
    throw new DocumentSignError('Hujjatni E-IMZO kaliti bilan imzolash kerak.', 400, 'EIMZO_REQUIRED');
  }
  if (!isAllowedOrigin(request, e.origin)) {
    throw new DocumentSignError('So‘rov manbasi tasdiqlanmadi.', 400, 'BAD_ORIGIN');
  }

  await connectToDatabase();
  const challenge = await consumeChallenge(e.challengeId);
  if (!challenge || challenge.userId !== userId || challenge.kind !== `sign:${documentId}`) {
    throw new DocumentSignError('Imzolash so‘rovi muddati tugagan. Qayta urinib ko‘ring.', 400, 'CHALLENGE_EXPIRED');
  }

  // Imzolash oynasi ochilgandan keyin hujjat o'zgargan bo'lsa, eski xesh imzolanmaydi
  const contentHash = await computeDocumentHash(documentId);
  if (!contentHash) throw new DocumentSignError('Hujjat topilmadi', 404, 'NOT_FOUND');

  const signedMessage = documentSignMessage({
    documentId,
    contentHash,
    challengeId: challenge.id,
    nonce: challenge.nonce,
    origin: e.origin as string,
  });

  let parsed;
  try {
    parsed = parseAndValidateCertificate(e.certPem);
    verifyEimzoSignature(parsed.cert, signedMessage, e.signature);
  } catch (err) {
    if (err instanceof EimzoError) {
      const message =
        err.code === 'BAD_SIGNATURE' ?
          'Imzo tasdiqlanmadi: kalit sertifikatga mos emas yoki hujjat imzolash paytida o‘zgargan.'
        : err.message;
      throw new DocumentSignError(message, err.code === 'CA_MISSING' ? 503 : 401, err.code);
    }
    throw err;
  }

  const stored = await prisma.userCertificate.findUnique({ where: { fingerprint256: parsed.fingerprint256 } });
  if (!stored || stored.userId !== userId) {
    throw new DocumentSignError('Bu sertifikat sizning hisobingizga biriktirilmagan.', 401, 'NOT_BOUND');
  }
  if (stored.status !== 'active') {
    throw new DocumentSignError('Sertifikat bekor qilingan.', 401, 'REVOKED');
  }

  // Kompyuter (Mezon agenti): birinchi imzoda yoziladi, keyin shu kompyuter talab qilinadi
  let device: VerifiedDocumentSignature['device'] = null;
  try {
    device = await verifyDeviceAttestation(request, {
      userId,
      origin: e.origin as string,
      nonce: challenge.nonce,
      certificateId: stored.id,
      certificateSubject: stored.subject,
      raw: e.device,
    });
  } catch (err) {
    if (err instanceof DeviceError) throw new DocumentSignError(err.message, err.status, err.code);
    throw err;
  }

  return {
    certificateId: stored.id,
    fingerprint256: stored.fingerprint256,
    contentHash,
    signature: e.signature as string,
    signedMessage,
    device,
  };
}

export async function saveDocumentSignature(
  documentId: string,
  userId: string,
  sig: VerifiedDocumentSignature
) {
  await prisma.documentSignature.create({
    data: {
      id: createDbId(),
      documentId,
      userId,
      certificateId: sig.certificateId,
      fingerprint256: sig.fingerprint256,
      contentHash: sig.contentHash,
      signature: sig.signature,
      signedMessage: sig.signedMessage,
      deviceId: sig.device?.deviceId ?? null,
      deviceMessage: sig.device?.message ?? null,
      deviceSignature: sig.device?.signature ?? null,
    },
  });
}

export type SignatureStatus = 'valid' | 'modified' | 'invalid';

/**
 * Hujjatdagi barcha imzolarni qayta tekshiradi:
 *  - imzo matematik jihatdan haqiqiymi (saqlangan sertifikat bilan);
 *  - hujjat imzodan keyin o'zgarmaganmi (joriy xesh = imzolangan xesh);
 *  - sertifikat imzo paytida amal qilganmi (bekor qilinishidan oldin).
 */
export async function listDocumentSignatures(documentId: string) {
  await connectToDatabase();
  const [rows, currentHash] = await Promise.all([
    prisma.documentSignature.findMany({
      where: { documentId },
      orderBy: { signedAt: 'asc' },
      include: {
        certificate: true,
        device: { select: { publicKey: true, hostname: true, primaryMac: true, diskSerial: true, status: true } },
        user: {
          select: {
            personal: { select: { fName: true, name: true, sName: true } },
            job: { select: { position: true, militaryRank: true } },
          },
        },
      },
    }),
    computeDocumentHash(documentId),
  ]);

  return rows.map((row) => {
    // Haqiqiy qayta tekshiruv: saqlangan matn + imzo + sertifikat. Matnda shu hujjat
    // va yozuvdagi xesh bo'lishi shart — boshqa hujjatdan ko'chirilgan imzo o'tmaydi.
    const parts = row.signedMessage.split('|');
    const cryptoOk =
      parts[0] === 'mezon-sign' &&
      parts[2] === documentId &&
      parts[3] === row.contentHash &&
      verifyStoredSignature(row.certificate.pem, row.signedMessage, row.signature);
    const revokedBeforeSign =
      row.certificate.status === 'revoked' && row.certificate.revokedAt && row.certificate.revokedAt <= row.signedAt;
    const status: SignatureStatus =
      !cryptoOk || revokedBeforeSign ? 'invalid'
      : currentHash !== row.contentHash ? 'modified'
      : 'valid';

    // Kompyuter tasdig'i: agent imzosi haqiqiy va aynan shu imzo so'rovi (nonce) uchun berilgan
    let deviceVerified = false;
    if (row.device && row.deviceMessage && row.deviceSignature) {
      const d = row.deviceMessage.split('|');
      const signParts = row.signedMessage.split('|');
      deviceVerified =
        d[0] === 'mezon-device' &&
        d[3] === signParts[5] &&
        verifyDeviceSignature(row.device.publicKey, row.deviceMessage, row.deviceSignature);
    }

    const p = row.user.personal;
    return {
      id: row.id,
      signedAt: row.signedAt,
      status,
      contentHash: row.contentHash,
      currentHash,
      fingerprint256: row.fingerprint256,
      certificateSubject: row.certificate.subject.replace(/\n/g, ', '),
      certificateRevokedAt: row.certificate.revokedAt,
      fullName: [p?.fName, p?.name, p?.sName].filter(Boolean).join(' '),
      position: row.user.job?.position ?? '',
      militaryRank: row.user.job?.militaryRank ?? '',
      device:
        row.device ?
          {
            hostname: row.device.hostname,
            mac: row.device.primaryMac,
            diskSerial: row.device.diskSerial,
            verified: deviceVerified,
          }
        : null,
    };
  });
}

function verifyDeviceSignature(spkiB64: string, message: string, signatureB64: string): boolean {
  try {
    const key = createPublicKey({ key: Buffer.from(spkiB64, 'base64'), format: 'der', type: 'spki' });
    return verifyRaw('sha256', Buffer.from(message, 'utf8'), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(signatureB64, 'base64'));
  } catch {
    return false;
  }
}

/** Saqlangan imzoni sertifikatning ochiq kaliti bilan qayta tekshiradi. */
export function verifyStoredSignature(certPem: string, message: string, signatureB64: string): boolean {
  try {
    const cert = new X509Certificate(certPem);
    return verifyRaw(
      'sha256',
      Buffer.from(message, 'utf8'),
      { key: cert.publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(signatureB64, 'base64')
    );
  } catch {
    return false;
  }
}
