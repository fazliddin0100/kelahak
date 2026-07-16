// api/users/sessions/grant-access/route.ts

import {
  findUserById,
  setJobAccessApproved,
} from '@/lib/db/user';
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

    if (!userId) {
      return NextResponse.json({ error: 'userId majburiy' }, { status: 400 });
    }

    if (userId === adminId) {
      return NextResponse.json(
        { error: "O'zingizga amal bajarish shart emas" },
        { status: 400 },
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
          error: 'Siz bu foydalanuvchini boshqara olmaysiz',
        },
        { status: 403 },
      );
    }

    if (user.job) {
      await setJobAccessApproved(userId, true);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Foydalanuvchiga tizimga kirish ruxsati berildi',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Allow session error:', error);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi!' },
      { status: 500 },
    );
  }
}
