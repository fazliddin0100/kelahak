import { logAdminAction } from '@/lib/auditLog';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Userning kompyuterini bekor qilish (kompyuter yoki disk almashganda). Keyingi imzoda
 * user yangi kompyuterdan imzolasa, u yangidan ro'yxatga olinadi. Body: { reason? }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  const { id } = await params;
  try {
    const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
    const reason =
      typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 200) : 'Superadmin bekor qildi';
    await connectToDatabase();
    const device = await prisma.userEimzoDevice.findUnique({
      where: { id },
      select: { status: true, hostname: true, primaryMac: true, user: { select: { auth: { select: { login: true } } } } },
    });
    if (!device) return NextResponse.json({ message: 'Kompyuter topilmadi' }, { status: 404 });
    if (device.status !== 'active') return NextResponse.json({ message: 'Allaqachon bekor qilingan' }, { status: 409 });

    await prisma.userEimzoDevice.update({
      where: { id },
      data: { status: 'revoked', revokedAt: new Date(), revokedReason: reason },
    });
    const login = device.user.auth?.login ?? '';
    await logAdminAction(
      request,
      check.userId,
      `E-IMZO kompyuteri bekor qilindi: ${login}; ${device.hostname || '-'} ${device.primaryMac}; sabab: ${reason}`
    );
    return NextResponse.json({
      message: `«${login}» kompyuteri bekor qilindi. Keyingi imzoda yangi kompyuter ro‘yxatga olinadi.`,
    });
  } catch (e) {
    console.error('E-IMZO kompyuterini bekor qilishda xato:', e);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
