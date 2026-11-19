import { createDbId } from '@/lib/db/document';
import { EimzoError, loadTrustedCa, parseAndValidateCertificate } from '@/lib/eimzo/verify';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

function caInfo() {
  try {
    const ca = loadTrustedCa();
    return { configured: true, subject: ca.subject.replace(/\n/g, ', '), validTo: ca.validTo };
  } catch (e) {
    return { configured: false, message: e instanceof Error ? e.message : 'CA sozlanmagan' };
  }
}

export async function GET(request: NextRequest) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  try {
    await connectToDatabase();
    const rows = await prisma.userCertificate.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fingerprint256: true,
        serialNumber: true,
        subject: true,
        notBefore: true,
        notAfter: true,
        status: true,
        revokedAt: true,
        revokedReason: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            auth: { select: { login: true } },
            personal: { select: { fName: true, name: true, sName: true } },
          },
        },
      },
    });
    const certificates = rows.map(({ user, subject, ...c }) => ({
      ...c,
      subject: subject.replace(/\n/g, ', '),
      userId: user.id,
      login: user.auth?.login ?? '',
      fullName: [user.personal?.fName, user.personal?.name, user.personal?.sName].filter(Boolean).join(' '),
    }));
    return NextResponse.json({ ca: caInfo(), certificates });
  } catch {
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

/** Userga ochiq sertifikatni biriktirish: { login, certPem } */
export async function POST(request: NextRequest) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  try {
    const body = (await request.json().catch(() => null)) as { login?: unknown; certPem?: unknown } | null;
    const login = typeof body?.login === 'string' ? body.login.trim().toLowerCase() : '';
    if (!login) return NextResponse.json({ message: 'Login kiriting' }, { status: 400 });

    let parsed;
    try {
      parsed = parseAndValidateCertificate(body?.certPem);
    } catch (e) {
      if (e instanceof EimzoError) {
        return NextResponse.json({ message: e.message, code: e.code }, { status: e.code === 'CA_MISSING' ? 503 : 400 });
      }
      throw e;
    }

    // Sertifikatdagi UID (login) boshqa userga tegishli bo'lsa — xato biriktirishning oldi olinadi
    if (parsed.uid && parsed.uid.toLowerCase() !== login) {
      return NextResponse.json(
        { message: `Sertifikat «${parsed.uid}» logini uchun berilgan, «${login}» uchun emas.` },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const auth = await prisma.auth.findUnique({ where: { login }, select: { userId: true } });
    if (!auth) return NextResponse.json({ message: 'Bunday loginli foydalanuvchi topilmadi' }, { status: 404 });

    const existing = await prisma.userCertificate.findUnique({ where: { fingerprint256: parsed.fingerprint256 } });
    if (existing) {
      return NextResponse.json({ message: 'Bu sertifikat allaqachon biriktirilgan' }, { status: 409 });
    }

    const created = await prisma.userCertificate.create({
      data: {
        id: createDbId(),
        userId: auth.userId,
        fingerprint256: parsed.fingerprint256,
        serialNumber: parsed.serialNumber,
        subject: parsed.subject,
        issuer: parsed.issuer,
        notBefore: parsed.notBefore,
        notAfter: parsed.notAfter,
        pem: parsed.pem,
      },
      select: { id: true },
    });
    return NextResponse.json(
      {
        message: `Sertifikat «${login}» ga biriktirildi. Endi u E-IMZO kaliti bilan kiradi.`,
        id: created.id,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('Sertifikat biriktirish xatosi:', e);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
