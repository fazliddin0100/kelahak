import { isValidDbId } from '@/lib/dbId';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Sertifikatni bekor qilish (revoke). Yozuv o'chirilmaydi — eski imzolarni
 * tekshirish uchun saqlanadi. Userning ochiq sessiyalari yopiladi.
 */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  const { id } = await params;
  if (!isValidDbId(id)) return NextResponse.json({ message: 'Noto‘g‘ri ID' }, { status: 400 });

  try {
    const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
    if (!reason) return NextResponse.json({ message: 'Bekor qilish sababini yozing' }, { status: 400 });

    await connectToDatabase();
    const cert = await prisma.userCertificate.findUnique({ where: { id } });
    if (!cert) return NextResponse.json({ message: 'Sertifikat topilmadi' }, { status: 404 });
    if (cert.status === 'revoked') {
      return NextResponse.json({ message: 'Sertifikat allaqachon bekor qilingan' }, { status: 409 });
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.userCertificate.update({
        where: { id },
        data: { status: 'revoked', revokedAt: now, revokedReason: reason },
      }),
      prisma.userSession.updateMany({
        where: { userId: cert.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    return NextResponse.json({ message: 'Sertifikat bekor qilindi, userning sessiyalari yopildi.' });
  } catch (e) {
    console.error('Sertifikatni bekor qilish xatosi:', e);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
