// app/api/users/route.ts
import { findUsersForAdmin } from '@/lib/adminScope';
import {
  findUserById,
  serializeJobForAdminList,
  serializePersonal,
} from '@/lib/db/user';
import { requireAdminOperator } from '@/lib/userAccess';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdminOperator(request);
    if (adminCheck instanceof NextResponse) return adminCheck;

    const admin = await findUserById(adminCheck.userId);
    if (!admin) {
      return NextResponse.json(
        { error: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    if (!admin.personal) {
      return NextResponse.json(
        { error: 'Personal topilmadi' },
        { status: 404 }
      );
    }

    const users = await findUsersForAdmin(admin);

    const result = users.map((u) => ({
      userId: u.id,
      login: u.auth?.login ?? '',
      personal: u.personal ? serializePersonal(u.personal) : null,
      job:
        u.job ?
          {
            ...serializeJobForAdminList(u.job),
            permissions: u.job.role?.permissions ?? [],
            shahobcha: u.job.shahobcha?.name ?? '',
          }
        : null,
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
