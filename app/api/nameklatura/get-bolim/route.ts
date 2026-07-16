import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { serializeBolim } from '@/lib/db/nomeklatura';
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

    const bolimlar = await prisma.bolim.findMany({
      where: { province: user.personal.province },
    });

    if (!bolimlar || bolimlar.length === 0) {
      return NextResponse.json(
        { message: 'Bo‘lim topilmadi' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'OK', bolimlar: bolimlar.map(serializeBolim) },
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
