import bcrypt from 'bcryptjs';
import JSZip from 'jszip';
import { logAdminAction } from '@/lib/auditLog';
import { decryptDocumentContent } from '@/lib/documentContentEncryption';
import { caChainPem } from '@/lib/eimzo/issuer';
import { packageContext } from '@/lib/eimzo/packages';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { consumeRateLimit, resetRateLimit } from '@/lib/rateLimit';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

const SCOPE = 'eimzo-package-download';
const ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function readme(login: string, fullName: string): string {
  return [
    `Mezon E-IMZO paketi: ${login}${fullName ? ` (${fullName})` : ''}`,
    '',
    `${login}.mzk  - shaxsiy kalit (kalit paroli bilan shifrlangan). Userning fleshkasiga yozing.`,
    `${login}.crt  - userning sertifikati (tizimga allaqachon biriktirilgan).`,
    'ca-chain.crt  - Mezon sertifikat markazi zanjiri (oraliq + bosh CA).',
    '',
    "Kalit parolini userga alohida, og'zaki bering. Paketni topshirgach kompyuterdan o'chiring.",
    "Bu paket serverdan faqat bir marta yuklab olinadi va o'chiriladi.",
    '',
  ].join('\r\n');
}

/**
 * Paketni bir marta yuklab olish. Superadmin o'z parolini qayta kiritishi shart.
 * Body: { password }. Natija: zip; paket serverdan o'chiriladi,
 * userning boshqa faol sertifikatlari bekor qilinadi.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  const { id } = await params;
  try {
    const limit = consumeRateLimit(SCOPE, check.userId, ATTEMPTS, WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { message: `Urinishlar ko‘p. ${Math.ceil(limit.retryAfterSeconds / 60)} daqiqadan keyin qayta urining.` },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }
    const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!password || password.length > 256) {
      return NextResponse.json({ message: 'Superadmin parolini kiriting' }, { status: 400 });
    }

    await connectToDatabase();
    const auth = await prisma.auth.findUnique({ where: { userId: check.userId }, select: { password: true } });
    const ok = !!auth?.password && (await bcrypt.compare(password, auth.password));
    if (!ok) {
      await logAdminAction(request, check.userId, `E-IMZO paketini yuklashda parol noto‘g‘ri (paket ${id})`);
      return NextResponse.json({ message: 'Parol noto‘g‘ri' }, { status: 403 });
    }
    resetRateLimit(SCOPE, check.userId);

    // Paket bitta tranzaksiyada olinib o'chiriladi: ikki marta yuklab bo'lmaydi
    const result = await prisma.$transaction(async (tx) => {
      const pkg = await tx.eimzoKeyPackage.findUnique({ where: { id } });
      if (!pkg) return null;
      const cert = await tx.userCertificate.findUnique({
        where: { id: pkg.certificateId },
        select: { pem: true, status: true },
      });
      if (!cert || cert.status !== 'active') return { pkg, cert: null, revoked: 0 };
      await tx.eimzoKeyPackage.delete({ where: { id } });
      const revoked = await tx.userCertificate.updateMany({
        where: { userId: pkg.userId, status: 'active', id: { not: pkg.certificateId } },
        data: { status: 'revoked', revokedAt: new Date(), revokedReason: 'Yangi E-IMZO kaliti bilan almashtirildi' },
      });
      return { pkg, cert, revoked: revoked.count };
    });
    if (!result) {
      return NextResponse.json({ message: 'Paket topilmadi yoki allaqachon yuklab olingan' }, { status: 404 });
    }
    const { pkg, cert, revoked } = result;
    if (!cert) {
      return NextResponse.json({ message: 'Bu paketning sertifikati bekor qilingan' }, { status: 410 });
    }

    const keyFile = decryptDocumentContent(pkg.keyFile, packageContext(pkg.id));
    const zip = new JSZip();
    zip.file(`${pkg.login}.mzk`, JSON.stringify(keyFile, null, 2));
    zip.file(`${pkg.login}.crt`, cert.pem.trim() + '\n');
    zip.file('ca-chain.crt', caChainPem());
    zip.file('README.txt', readme(pkg.login, pkg.fullName));
    const content = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });

    await logAdminAction(
      request,
      check.userId,
      `E-IMZO paketi yuklab olindi va serverdan o‘chirildi: ${pkg.login}` +
        (revoked ? `; eski sertifikatlar bekor qilindi: ${revoked}` : '')
    );
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${pkg.login}-eimzo.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('E-IMZO paketini yuklashda xato:', e);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

/** Yuklab olinmagan paketni bekor qilish: paket o'chiriladi, sertifikati bekor qilinadi */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  const { id } = await params;
  try {
    await connectToDatabase();
    const pkg = await prisma.$transaction(async (tx) => {
      const p = await tx.eimzoKeyPackage.findUnique({ where: { id }, select: { id: true, login: true, certificateId: true } });
      if (!p) return null;
      await tx.eimzoKeyPackage.delete({ where: { id } });
      await tx.userCertificate.updateMany({
        where: { id: p.certificateId, status: 'active' },
        data: { status: 'revoked', revokedAt: new Date(), revokedReason: 'Paket yuklab olinmasdan bekor qilindi' },
      });
      return p;
    });
    if (!pkg) return NextResponse.json({ message: 'Paket topilmadi' }, { status: 404 });
    await logAdminAction(request, check.userId, `E-IMZO paketi bekor qilindi: ${pkg.login}`);
    return NextResponse.json({ message: `«${pkg.login}» paketi bekor qilindi` });
  } catch (e) {
    console.error('E-IMZO paketini bekor qilishda xato:', e);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
