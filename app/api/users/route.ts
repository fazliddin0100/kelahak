// app/api/users/route.ts
import {
  findUserById,
  findUsersInProvince,
  serializeJobForAdminList,
  serializePersonal,
} from '@/lib/db/user';
import { requireAdminOperator } from '@/lib/userAccess';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdminOperator(request);
    if (adminCheck instanceof NextResponse) return adminCheck;

    const userId = adminCheck.userId;

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    if (!user.personal) {
      return NextResponse.json(
        { error: 'Personal topilmadi' },
        { status: 404 }
      );
    }

    const usersInSameProvince = await findUsersInProvince(user.personal.province);

    const result = usersInSameProvince.map((u) => ({
      userId: u.id,
      personal: u.personal ? serializePersonal(u.personal) : null,
      job: u.job ? serializeJobForAdminList(u.job) : null,
    }));

    return NextResponse.json({ users: result }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi!' },
      { status: 500 }
    );
  }
}
