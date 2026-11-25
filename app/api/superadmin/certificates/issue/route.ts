import { logAdminAction } from '@/lib/auditLog';
import { createDbId } from '@/lib/db/document';
import { encryptDocumentContent } from '@/lib/documentContentEncryption';
import { issueUserCertificate } from '@/lib/eimzo/issuer';
import { packageContext } from '@/lib/eimzo/packages';
import { EimzoError, parseAndValidateCertificate } from '@/lib/eimzo/verify';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

const MAX_KEY_FILE = 16 * 1024;
const MAX_CSR = 8 * 1024;
const MIN_KDF_ITERATIONS = 600_000;

/** .mzk tuzilishi tekshiriladi (ichi kalit paroli bilan shifrlangan — server o'qiy olmaydi) */
function parseKeyFile(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'string' || raw.length > MAX_KEY_FILE) return null;
  try {
    const k = JSON.parse(raw) as {
      format?: unknown;
      algorithm?: unknown;
      kdf?: { name?: unknown; iterations?: unknown; salt?: unknown };
      cipher?: { name?: unknown; iv?: unknown };
      data?: unknown;
    };
    const ok =
      k.format === 'mezon-key/v1' &&
      k.algorithm === 'ECDSA-P256' &&
      k.kdf?.name === 'PBKDF2' &&
      typeof k.kdf.iterations === 'number' &&
      k.kdf.iterations >= MIN_KDF_ITERATIONS &&
      typeof k.kdf.salt === 'string' &&
      k.cipher?.name === 'AES-GCM' &&
      typeof k.cipher.iv === 'string' &&
      typeof k.data === 'string';
    return ok ? (k as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Brauzerda yaratilgan kalit (.mzk) va so'rov (.csr) serverga keladi:
 * oraliq CA sertifikatni imzolaydi, userga biriktiradi va bir martalik paketni saqlaydi.
 * Body: { userId, csrPem, keyFileJson, fullName? }
 */
export async function POST(request: NextRequest) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  try {
    const body = (await request.json().catch(() => null)) as {
      userId?: unknown;
      csrPem?: unknown;
      keyFileJson?: unknown;
    } | null;
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const csrPem = typeof body?.csrPem === 'string' && body.csrPem.length <= MAX_CSR ? body.csrPem : '';
    const keyFile = parseKeyFile(body?.keyFileJson);
    if (!userId || !csrPem) return NextResponse.json({ message: 'User va so‘rov (.csr) kerak' }, { status: 400 });
    if (!keyFile) return NextResponse.json({ message: 'Kalit fayli (.mzk) noto‘g‘ri' }, { status: 400 });

    await connectToDatabase();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        auth: { select: { login: true } },
        personal: { select: { fName: true, name: true, sName: true } },
        job: { select: { shahobcha: { select: { name: true, province: true } } } },
      },
    });
    const login = user?.auth?.login;
    if (!user || !login) return NextResponse.json({ message: 'Foydalanuvchi topilmadi' }, { status: 404 });

    let issued;
    try {
      issued = await issueUserCertificate(csrPem, login);
    } catch (e) {
      if (e instanceof EimzoError) {
        return NextResponse.json({ message: e.message, code: e.code }, { status: e.code === 'CA_MISSING' ? 503 : 400 });
      }
      throw e;
    }
    const parsed = parseAndValidateCertificate(issued.pem);
    const fullName = user.personal
      ? `${user.personal.fName} ${user.personal.name} ${user.personal.sName}`.replace(/\s+/g, ' ').trim()
      : '';
    const sh = user.job?.shahobcha;
    const shahobcha = sh ? `${sh.name} (${sh.province})` : '';
    const packageId = createDbId();
    const certificateId = createDbId();

    const replaced = await prisma.$transaction(async (tx) => {
      // Shu user uchun yuklab olinmagan eski paket bo'lsa — uning sertifikati bekor qilinadi
      const old = await tx.eimzoKeyPackage.findUnique({ where: { userId }, select: { id: true, certificateId: true } });
      if (old) {
        await tx.userCertificate.updateMany({
          where: { id: old.certificateId, status: 'active' },
          data: { status: 'revoked', revokedAt: new Date(), revokedReason: 'Yuklab olinmagan paket yangisi bilan almashtirildi' },
        });
        await tx.eimzoKeyPackage.delete({ where: { id: old.id } });
      }
      await tx.userCertificate.create({
        data: {
          id: certificateId,
          userId,
          fingerprint256: parsed.fingerprint256,
          serialNumber: parsed.serialNumber,
          subject: parsed.subject,
          issuer: parsed.issuer,
          notBefore: parsed.notBefore,
          notAfter: parsed.notAfter,
          pem: parsed.pem,
        },
      });
      await tx.eimzoKeyPackage.create({
        data: {
          id: packageId,
          userId,
          certificateId,
          login,
          fullName,
          shahobcha,
          keyFile: encryptDocumentContent(keyFile, packageContext(packageId)) as object,
          createdById: check.userId,
        },
      });
      return !!old;
    });

    await logAdminAction(
      request,
      check.userId,
      `E-IMZO sertifikati serverda chiqarildi va biriktirildi: ${login}; SHA-256 ${parsed.fingerprint256.slice(0, 23)}…` +
        (replaced ? ' (eski yuklanmagan paket almashtirildi)' : '')
    );
    return NextResponse.json(
      {
        message: `«${login}» uchun E-IMZO tayyor. Paketni «Tayyor E-IMZO paketlari» bo‘limidan yuklab oling.`,
        id: packageId,
        login,
        fingerprint256: parsed.fingerprint256,
        notAfter: parsed.notAfter,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('E-IMZO chiqarish xatosi:', e);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
