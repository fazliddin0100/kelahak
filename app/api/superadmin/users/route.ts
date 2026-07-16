import connectToDatabase, { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;

  try {
    await connectToDatabase();

    const users = await prisma.user.findMany({
      include: {
        personal: true,
        job: { include: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = users.map((u) => {
      const jobRaw = u.job;

      return {
        userId: u.id,
        personal: u.personal ?
          { ...u.personal, _id: u.personal.id }
        : null,
        job: jobRaw ?
          {
            position: jobRaw.position ?? '',
            organ: jobRaw.organ ?? '',
            department: jobRaw.department ?? '',
            militaryRank: jobRaw.militaryRank ?? '',
            isUserTrue: Boolean(jobRaw.isUserTrue),
            roleName: jobRaw.role?.role ?? 'user',
          }
        : null,
        createdAt: u.createdAt,
      };
    });

    return NextResponse.json({ users: result });
  } catch {
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
