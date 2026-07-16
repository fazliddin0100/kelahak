import connectToDatabase, { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;

  try {
    await connectToDatabase();
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: 'userId kerak' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { job: true },
    });
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    if (!user.job) {
      return NextResponse.json(
        { message: 'Lavozim topilmadi' },
        { status: 404 }
      );
    }

    await prisma.job.update({
      where: { id: user.job.id },
      data: { isUserTrue: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Foydalanuvchiga tizimga kirish ruxsati berildi',
    });
  } catch {
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
