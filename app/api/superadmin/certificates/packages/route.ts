import { isAutoIssueConfigured } from '@/lib/eimzo/issuer';
import { macFromSubject } from '@/lib/eimzo/mac';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

/** Yuklab olinishini kutayotgan E-IMZO paketlari (kalit mazmunisiz) */
export async function GET(request: NextRequest) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  try {
    await connectToDatabase();
    const rows = await prisma.eimzoKeyPackage.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, userId: true, login: true, fullName: true, shahobcha: true, createdAt: true, certificateId: true },
    });
    const certs = await prisma.userCertificate.findMany({
      where: { id: { in: rows.map((r) => r.certificateId) } },
      select: { id: true, notAfter: true, fingerprint256: true, subject: true },
    });
    const byId = new Map(certs.map((c) => [c.id, c]));
    return NextResponse.json(
      {
        autoIssue: isAutoIssueConfigured(),
        packages: rows.map(({ certificateId, ...r }) => ({
          ...r,
          notAfter: byId.get(certificateId)?.notAfter ?? null,
          fingerprint256: byId.get(certificateId)?.fingerprint256 ?? '',
          mac: macFromSubject(byId.get(certificateId)?.subject ?? ''),
        })),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    console.error('E-IMZO paketlari ro‘yxatida xato:', e);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
