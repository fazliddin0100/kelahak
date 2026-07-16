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
    });

    let pending = 0;
    let approved = 0;
    const byRole: Record<string, number> = {};
    const byProvince: Record<string, number> = {};

    for (const u of users) {
      const job = u.job;

      if (job?.isUserTrue) approved++;
      else pending++;

      const roleName = job?.role?.role ?? 'unknown';
      byRole[roleName] = (byRole[roleName] ?? 0) + 1;

      const prov = u.personal?.province ?? 'Noma’lum';
      byProvince[prov] = (byProvince[prov] ?? 0) + 1;
    }

    const superAdminCount = await prisma.job.count({
      where: { role: { role: 'superAdmin' } },
    });

    return NextResponse.json({
      totalUsers: users.length,
      pendingApproval: pending,
      approvedUsers: approved,
      superAdminCount,
      byRole,
      byProvince,
    });
  } catch (error) {
    console.error('SuperAdmin stats xatosi:', error);
    const message =
      error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ message }, { status: 500 });
  }
}
