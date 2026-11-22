import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { organizationAddressLabel } from '@/lib/documentAddress';

/** Hujjat manzili uchun: tizimda ro'yxatdan o'tgan barcha korxonalar (shahobchalar) */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const rows = await prisma.shahobcha.findMany({
      select: { id: true, name: true, province: true },
      orderBy: [{ province: 'asc' }, { name: 'asc' }],
      take: 2000,
    });
    return NextResponse.json(
      {
        organizations: rows.map((r) => ({
          id: r.id,
          name: r.name,
          province: r.province,
          label: organizationAddressLabel(r.name, r.province),
        })),
        ownShahobchaId: auth.user.job?.shahobchaId ?? null,
      },
      { headers: { 'Cache-Control': 'private, max-age=60' } }
    );
  } catch (error) {
    console.error('Korxonalar ro‘yxatida xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
