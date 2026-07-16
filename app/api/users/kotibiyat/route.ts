import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import {
  findUserById,
  findUsersByIds,
} from '@/lib/db/user';
import { findKotibiyatStaffUserIds } from '@/lib/kotibiyatStaff';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;


    if (!user.personal?.province) {
      return NextResponse.json(
        { error: 'Personal topilmadi' },
        { status: 404 }
      );
    }

    const staffIds = await findKotibiyatStaffUserIds(user.personal.province);
    if (staffIds.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const usersInSameProvince = await findUsersByIds(staffIds);

    const result = usersInSameProvince.map((u) => ({
      userId: u.id,
      personal:
        u.personal ?
          { ...u.personal, _id: u.personal.id }
        : null,
      job:
        u.job ?
          { ...u.job, _id: u.job.id }
        : null,
    }));

    return NextResponse.json({ users: result }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi!' },
      { status: 500 }
    );
  }
}
