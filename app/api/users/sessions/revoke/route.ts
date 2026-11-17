// api/users/sessions/revoke/route.ts

import {
  findUserById,
  isValidDbId,
  setJobAccessApproved,
} from '@/lib/db/user';
import { prisma } from '@/lib/prisma';
import { requireAdminOperator } from '@/lib/userAccess';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdminOperator(request);
    if (adminCheck instanceof NextResponse) return adminCheck;
    const adminId = adminCheck.userId;

    const admin = await findUserById(adminId);
    if (!admin) {
      return NextResponse.json(
        { error: 'Foydalanuvchi tizimda mavjud emas' },
        { status: 401 },
      );
    }

    const adminProvince = admin.personal?.province;

    if (!adminProvince) {
      return NextResponse.json(
        { error: "Adminning province ma'lumoti topilmadi" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (typeof userId !== 'string' || !isValidDbId(userId)) {
      return NextResponse.json({ error: 'userId majburiy' }, { status: 400 });
    }

    if (userId === adminId) {
      return NextResponse.json(
        { error: "O'z akkauntingizni bloklay olmaysiz" },
        { status: 403 },
      );
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Foydalanuvchi topilmadi' },
        { status: 404 },
      );
    }

    const targetProvince = user.personal?.province;

    if (!targetProvince || adminProvince !== targetProvince) {
      return NextResponse.json(
        {
          error:
            'Siz bu foydalanuvchini bloklash huquqiga ega emassiz. Faqat o‘z viloyatingizdagi foydalanuvchilarni boshqarishingiz mumkin.',
        },
        { status: 403 },
      );
    }

    const targetRole = user.job?.role?.role;
    if (
      admin.job?.role?.role !== 'superAdmin' &&
      (targetRole === 'admin' || targetRole === 'superAdmin')
    ) {
      return NextResponse.json(
        {
          error:
            'Kotibiyat (admin) akkauntini faqat SuperAdmin bloklashi mumkin',
        },
        { status: 403 },
      );
    }

    if (user.job) {
      await setJobAccessApproved(userId, false);
      await prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Foydalanuvchi tizimdan chiqarildi va bloklandi',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Revoke session error:', error);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi!' },
      { status: 500 },
    );
  }
}
