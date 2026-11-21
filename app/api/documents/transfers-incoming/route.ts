import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';

/** Joriy xodimga topshirilgan, hali qabul qilinmagan hujjatlar */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const rows = await prisma.document.findMany({
      where: { pendingTransferToId: auth.userId },
      select: {
        id: true,
        title: true,
        registrationIndex: true,
        pendingTransferAt: true,
        pendingTransferNote: true,
        owner: { select: { personal: { select: { fName: true, name: true, sName: true } } } },
      },
      orderBy: { pendingTransferAt: 'desc' },
      take: 100,
    });
    const transfers = rows.map((r) => ({
      id: r.id,
      title: r.title ?? 'Hujjat',
      registrationIndex: r.registrationIndex,
      note: r.pendingTransferNote,
      at: r.pendingTransferAt?.toISOString() ?? null,
      fromName: r.owner?.personal ?
        `${r.owner.personal.fName} ${r.owner.personal.name} ${r.owner.personal.sName}`.trim()
      : '',
    }));
    return NextResponse.json({ transfers }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Topshirilgan hujjatlar ro‘yxatida xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
