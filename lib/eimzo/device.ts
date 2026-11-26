import { createHash, createPublicKey, verify as verifyRaw } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/clientIp';
import { createDbId } from '@/lib/db/document';
import { macFromSubject, normalizeMac } from '@/lib/eimzo/mac';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { logSecurityEvent } from '@/lib/securityLog';

/**
 * Mezon agenti (agent/MezonAgent) tasdig'i: imzo qaysi kompyuterdan qo'yilganini tekshirish.
 *
 * Birinchi imzoda: E-IMZO sertifikati haqiqiy va shu userniki (documentSign.ts tekshiradi),
 * sertifikatdagi MAC agent bergan MAC lar ichida — shunda kompyuter (qurilma kaliti, MAC lar,
 * disk seriyasi) userga yozib qo'yiladi. Keyingi imzolarda xuddi shu qurilma kaliti, disk
 * seriyasi va birinchi imzodagi MAC talab qilinadi (yozilgan qiymatlar keyin o'zgartirilmaydi).
 *
 * E-IMZO kaliti (.mzk) fleshkada turadi: agent imzo paytida kalit fayli (SHA-256) ulangan USB
 * qurilmada borligini va fleshka seriyasini tasdiqlaydi. Fleshka olib qo'yilsa agent tasdiq
 * bermaydi — imzo qabul qilinmaydi. Fleshka seriyasi va kalit SHA-256 birinchi imzoda yoziladi.
 *
 * Agent imzolaydigan matn (v2):
 * `mezon-device|v2|{origin}|{nonce}|{macs}|{diskSerial}|{publicKeySha256}|{usbSerial}|{keySha256}`.
 */

export class DeviceError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}

/** EIMZO_DEVICE_REQUIRED=true — agentsiz imzo umuman qabul qilinmaydi (hamma kompyuterga agent o'rnatilgach) */
export function isDeviceRequiredGlobally(): boolean {
  return process.env.EIMZO_DEVICE_REQUIRED === 'true';
}

/** Kompyuter talab qilinadimi: hamma uchun yoqilgan yoki userning kompyuteri allaqachon yozilgan */
export async function isDeviceRequired(userId: string): Promise<boolean> {
  if (isDeviceRequiredGlobally()) return true;
  await connectToDatabase();
  return (await prisma.userEimzoDevice.count({ where: { userId, status: 'active' } })) > 0;
}

export function deviceMessage(p: {
  origin: string;
  challenge: string;
  macs: string;
  diskSerial: string;
  publicKeySha256: string;
  usbSerial: string;
  keySha256: string;
}): string {
  return [
    'mezon-device',
    'v2',
    p.origin,
    p.challenge,
    p.macs,
    p.diskSerial,
    p.publicKeySha256,
    p.usbSerial,
    p.keySha256,
  ].join('|');
}

type Attestation = {
  usbSerial: string;
  usbSerialReliable: boolean;
  usbModel: string;
  keySha256: string;
  macs: string[];
  macsJoined: string;
  primaryMac: string;
  diskSerial: string;
  diskModel: string;
  diskSerialReliable: boolean;
  hardwareKey: boolean;
  hostname: string;
  publicKey: string;
  publicKeySha256: string;
  signature: string;
};

const str = (v: unknown, max: number) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : null);

/** Eski agent (1.0) — fleshka tasdig'isiz */
function isLegacyAttestation(raw: unknown): boolean {
  return !!raw && typeof raw === 'object' && (raw as Record<string, unknown>).format !== 'v2';
}

/** Agent javobini tekshiradi (tuzilishi, MAC formati, kalit barmoq izi). Noto'g'ri bo'lsa null. */
export function parseAttestation(raw: unknown): Attestation | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.format !== 'v2') return null;
  const usbSerial = str(r.usbSerial, 128);
  const keySha256 = str(r.keySha256, 64);
  if (!usbSerial || /[|,]/.test(usbSerial) || !keySha256 || !/^[0-9a-f]{64}$/.test(keySha256)) return null;
  const macsJoined = str(r.macs, 400);
  const diskSerial = str(r.diskSerial, 128);
  const publicKey = str(r.publicKey, 400);
  const publicKeySha256 = str(r.publicKeySha256, 64);
  const signature = str(r.signature, 200);
  if (!macsJoined || !diskSerial || !publicKey || !publicKeySha256 || !signature) return null;
  if (diskSerial.includes('|') || !/^[0-9a-f]{64}$/.test(publicKeySha256)) return null;

  const macs = macsJoined.split(',');
  if (macs.length > 16 || macs.some((m) => normalizeMac(m) !== m)) return null;
  // Agent alifbo tartibida, takrorsiz yuboradi — boshqacha bo'lsa imzolangan matn mos kelmaydi
  if ([...new Set(macs)].sort().join(',') !== macsJoined) return null;
  const primaryMac = typeof r.mac === 'string' && macs.includes(r.mac) ? r.mac : macs[0];

  let spki: Buffer;
  try {
    spki = Buffer.from(publicKey, 'base64');
  } catch {
    return null;
  }
  if (createHash('sha256').update(spki).digest('hex') !== publicKeySha256) return null;

  return {
    usbSerial,
    usbSerialReliable: r.usbSerialReliable !== false,
    usbModel: typeof r.usbModel === 'string' ? r.usbModel.slice(0, 120) : '',
    keySha256,
    macs,
    macsJoined,
    primaryMac,
    diskSerial,
    diskModel: typeof r.diskModel === 'string' ? r.diskModel.slice(0, 120) : '',
    diskSerialReliable: r.diskSerialReliable !== false,
    hardwareKey: r.hardwareKey === true,
    hostname: typeof r.hostname === 'string' ? r.hostname.slice(0, 64) : '',
    publicKey,
    publicKeySha256,
    signature,
  };
}

function verifyAttestationSignature(att: Attestation, message: string): boolean {
  try {
    const key = createPublicKey({ key: Buffer.from(att.publicKey, 'base64'), format: 'der', type: 'spki' });
    if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') return false;
    return verifyRaw('sha256', Buffer.from(message, 'utf8'), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(att.signature, 'base64'));
  } catch {
    return false;
  }
}

export type VerifiedDevice = { deviceId: string; message: string; signature: string; registered: boolean };

async function reject(request: NextRequest, userId: string, message: string, code: string, detail: string): Promise<never> {
  await logSecurityEvent({
    type: 'suspicious',
    ip: getClientIp(request.headers),
    path: new URL(request.url).pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') ?? undefined,
    loginHint: userId,
    message: `E-IMZO kompyuter tekshiruvi: ${code}. ${detail}`.slice(0, 500),
    statusCode: 403,
  });
  throw new DeviceError(message, 403, code);
}

/**
 * Imzo so'rovidagi agent tasdig'ini tekshiradi. Kompyuter talab qilinmasa va tasdiq yo'q bo'lsa null.
 * Chaqirishdan oldin E-IMZO imzosi va sertifikat (shu userniki, faol) tekshirilgan bo'lishi shart.
 */
export async function verifyDeviceAttestation(
  request: NextRequest,
  p: { userId: string; origin: string; nonce: string; certificateId: string; certificateSubject: string; raw: unknown }
): Promise<VerifiedDevice | null> {
  await connectToDatabase();
  const required = await isDeviceRequired(p.userId);

  if (p.raw === undefined || p.raw === null) {
    if (!required) return null;
    throw new DeviceError(
      'Imzolash uchun kompyuterda «Mezon agenti» ishlab turishi kerak. Administratorga murojaat qiling.',
      400,
      'DEVICE_REQUIRED'
    );
  }

  if (isLegacyAttestation(p.raw)) {
    throw new DeviceError(
      'E-IMZO kaliti fleshkada bo‘lishi va kompyuterdagi «Mezon agenti» yangilangan (1.1) bo‘lishi kerak.',
      400,
      'DEVICE_USB_REQUIRED'
    );
  }
  const att = parseAttestation(p.raw);
  if (!att) return reject(request, p.userId, 'Kompyuter tasdig‘i noto‘g‘ri.', 'DEVICE_BAD', 'tuzilishi yaroqsiz');

  const message = deviceMessage({
    origin: p.origin,
    challenge: p.nonce,
    macs: att.macsJoined,
    diskSerial: att.diskSerial,
    publicKeySha256: att.publicKeySha256,
    usbSerial: att.usbSerial,
    keySha256: att.keySha256,
  });
  if (!verifyAttestationSignature(att, message)) {
    return reject(request, p.userId, 'Kompyuter tasdig‘i imzosi noto‘g‘ri.', 'DEVICE_BAD_SIGNATURE', att.publicKeySha256.slice(0, 16));
  }

  // Sertifikatdagi MAC (superadmin kalit yaratishda kiritgan) shu kompyuterda bo'lishi shart
  const certMac = macFromSubject(p.certificateSubject);
  if (certMac && !att.macs.includes(certMac)) {
    return reject(
      request,
      p.userId,
      `Bu kompyuter E-IMZO berilgan kompyuter emas (sertifikatdagi MAC ${certMac} topilmadi).`,
      'DEVICE_MAC_MISMATCH',
      `sertifikat ${certMac}, kompyuter ${att.macsJoined}`
    );
  }

  const existing = await prisma.userEimzoDevice.findFirst({
    where: { userId: p.userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  // ── Birinchi aloqa: kompyuter userga yozib qo'yiladi ──
  if (!existing) {
    const id = createDbId();
    await prisma.userEimzoDevice.create({
      data: {
        id,
        userId: p.userId,
        publicKey: att.publicKey,
        publicKeySha256: att.publicKeySha256,
        macs: att.macsJoined,
        primaryMac: att.primaryMac,
        diskSerial: att.diskSerial,
        diskModel: att.diskModel,
        diskSerialReliable: att.diskSerialReliable,
        hardwareKey: att.hardwareKey,
        hostname: att.hostname,
        usbSerial: att.usbSerial,
        usbSerialReliable: att.usbSerialReliable,
        usbModel: att.usbModel,
        keySha256: att.keySha256,
        certificateId: p.certificateId,
      },
    });
    await logSecurityEvent({
      type: 'admin_action',
      ip: getClientIp(request.headers),
      path: new URL(request.url).pathname,
      method: request.method,
      loginHint: p.userId,
      message:
        `E-IMZO kompyuteri ro'yxatga olindi: ${att.hostname || '-'}; MAC ${att.macsJoined}; disk ${att.diskSerial}` +
        `${att.diskSerialReliable ? '' : ' (noyob emas)'}; kalit ${att.hardwareKey ? 'TPM' : 'dasturiy'} ${att.publicKeySha256.slice(0, 16)}` +
        `; fleshka ${att.usbSerial}${att.usbSerialReliable ? '' : ' (noyob emas)'}`,
      statusCode: 200,
    });
    return { deviceId: id, message, signature: att.signature, registered: true };
  }

  // ── Keyingi imzolar: aynan shu kompyuter ──
  if (existing.publicKeySha256 !== att.publicKeySha256) {
    return reject(
      request,
      p.userId,
      'Imzo ro‘yxatga olingan kompyuterdan qo‘yilmayapti. Kompyuter almashgan bo‘lsa, administratorga murojaat qiling.',
      'DEVICE_MISMATCH',
      `kutilgan kalit ${existing.publicKeySha256.slice(0, 16)}, kelgan ${att.publicKeySha256.slice(0, 16)}`
    );
  }
  if (existing.diskSerial !== att.diskSerial) {
    return reject(
      request,
      p.userId,
      'Kompyuterning diski o‘zgargan. Administratorga murojaat qiling.',
      'DEVICE_DISK_MISMATCH',
      `kutilgan ${existing.diskSerial}, kelgan ${att.diskSerial}`
    );
  }
  // Birinchi imzoda (E-IMZO birinchi ishlatilganda) yozilgan MAC shu kompyuterda bo'lishi shart
  if (!att.macs.includes(existing.primaryMac)) {
    return reject(
      request,
      p.userId,
      `Kompyuterning tarmoq kartasi o‘zgargan (birinchi imzodagi MAC ${existing.primaryMac} topilmadi). Administratorga murojaat qiling.`,
      'DEVICE_MAC_MISMATCH',
      `kutilgan ${existing.primaryMac}, kelgan ${att.macsJoined}`
    );
  }

  // ── Fleshka: kalit birinchi imzodagi fleshkada va aynan o'sha fayl ──
  // Fleshka hali yozilmagan (eski yozuv) yoki superadmin yangi sertifikat bergan — yangi fleshka yoziladi
  const usbFirst = !existing.usbSerial || existing.certificateId !== p.certificateId;
  if (!usbFirst) {
    if (existing.usbSerial !== att.usbSerial) {
      return reject(
        request,
        p.userId,
        'E-IMZO kaliti ro‘yxatga olingan fleshkada emas. Fleshka almashgan bo‘lsa, administratorga murojaat qiling.',
        'DEVICE_USB_MISMATCH',
        `kutilgan fleshka ${existing.usbSerial}, kelgan ${att.usbSerial}`
      );
    }
    if (existing.keySha256 !== att.keySha256) {
      return reject(
        request,
        p.userId,
        'Fleshkadagi kalit fayli birinchi imzodagi kalit emas.',
        'DEVICE_KEY_MISMATCH',
        `kutilgan ${existing.keySha256.slice(0, 16)}, kelgan ${att.keySha256.slice(0, 16)}`
      );
    }
  }

  // Birinchi yozilgan MAC lar va disk o'zgartirilmaydi — keyingi tekshiruvlar shular bilan solishtiriladi
  await prisma.userEimzoDevice.update({
    where: { id: existing.id },
    data: {
      lastSeenAt: new Date(),
      hostname: att.hostname,
      ...(usbFirst ?
        {
          usbSerial: att.usbSerial,
          usbSerialReliable: att.usbSerialReliable,
          usbModel: att.usbModel,
          keySha256: att.keySha256,
          certificateId: p.certificateId,
        }
      : {}),
    },
  });
  if (usbFirst) {
    await logSecurityEvent({
      type: 'admin_action',
      ip: getClientIp(request.headers),
      path: new URL(request.url).pathname,
      method: request.method,
      loginHint: p.userId,
      message: `E-IMZO fleshkasi ro'yxatga olindi: ${att.usbSerial} ${att.usbModel}; kalit ${att.keySha256.slice(0, 16)}`.slice(0, 500),
      statusCode: 200,
    });
  }
  return { deviceId: existing.id, message, signature: att.signature, registered: false };
}
