// app/api/users/user-role/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

    const job = user.job;
    if (!job) {
      return NextResponse.json(
        { error: "Shaxsga doir ma'lumot topilmadi" },
        { status: 404 }
      );
    }

    const roleRecord = job.role;
    if (!roleRecord) {
      return NextResponse.json(
        { error: "Shaxsga doir ma'lumot topilmadi" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        role: roleRecord.role,
        userId: user.id,
        province: user.personal?.province ?? '',
      },
      { status: 200 }
    );
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi!' },
      { status: 500 }
    );
  }
}
