import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { serializeBolinma } from '@/lib/db/nomeklatura';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

    if (!user.personal) {
      return NextResponse.json(
        { message: "Foydalanuvchining ma'lumoti topilmadi" },
        { status: 400 }
      );
    }

    const bolinmalar = await prisma.bolinma.findMany({
      where: { province: user.personal.province },
    });

    if (!bolinmalar || bolinmalar.length === 0) {
      return NextResponse.json(
        { message: 'Bo‘lim topilmadi' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Bo‘limlar muvaffaqiyatli olindi',
        bolinmalar: bolinmalar.map(serializeBolinma),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Serverda xatolik', error: message },
      { status: 500 }
    );
  }
}
