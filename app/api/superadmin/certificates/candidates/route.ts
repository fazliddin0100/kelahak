import { type NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/superadminAuth';

/**
 * Kalit yaratish formasi uchun: barcha shahobchalar va har biridagi xodimlar
 * (login, to'liq F.I.Sh, lavozim, faol sertifikati bormi).
 */
export async function GET(request: NextRequest) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  try {
    await connectToDatabase();
    const shahobchalar = await prisma.shahobcha.findMany({
      orderBy: [{ province: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        province: true,
        jobs: {
          select: {
            position: true,
            militaryRank: true,
            isUserTrue: true,
            user: {
              select: {
                id: true,
                auth: { select: { login: true } },
                personal: { select: { fName: true, name: true, sName: true } },
                certificates: { where: { status: 'active' }, select: { id: true } },
              },
            },
          },
        },
      },
    });

    const result = shahobchalar.map((s) => ({
      id: s.id,
      name: s.name,
      province: s.province,
      users: s.jobs
        .filter((j) => j.user?.auth?.login)
        .map((j) => ({
          userId: j.user.id,
          login: j.user.auth!.login,
          fullName: j.user.personal ?
            `${j.user.personal.fName} ${j.user.personal.name} ${j.user.personal.sName}`.replace(/\s+/g, ' ').trim()
          : '',
          position: j.position ?? '',
          approved: j.isUserTrue,
          hasActiveCertificate: j.user.certificates.length > 0,
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    }));

    return NextResponse.json({ shahobchalar: result }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Sertifikat uchun xodimlar ro‘yxatida xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
