import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/prisma';
import { fetchUserNomeklaturaGrouped } from '@/lib/userNomeklatura';


import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

    if (!user.personal?.province) {
      return NextResponse.json(
        { message: "Foydalanuvchining ma'lumoti topilmadi" },
        { status: 400 }
      );
    }

    const { results, total } = await fetchUserNomeklaturaGrouped(
      userId,
      user.personal.province
    );

    if (total === 0) {
      return NextResponse.json(
        {
          message:
            'Siz yaratgan, javobgar bo‘lgan yoki hujjatingiz biriktirilgan nomeklatura topilmadi',
          results: [],
          total: 0,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: 'Foydalanuvchi nomeklaturasi olindi',
        results,
        total,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Serverda xatolik';
    return NextResponse.json({ message: 'Serverda xatolik', error: message }, {
      status: 500,
    });
  }
}
