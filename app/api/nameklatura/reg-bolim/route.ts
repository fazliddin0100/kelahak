import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { createDbId, serializeBolim } from '@/lib/db/nomeklatura';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { bolim } = await request.json();

    if (!bolim) {
      return NextResponse.json(
        { message: "Bolim maydonlari to'ldirilishi kerak" },
        { status: 400 }
      );
    }

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

    if (!user.personal) {
      return NextResponse.json(
        { message: "Foydalanuvchining ma'lumoti topilmadi" },
        { status: 400 }
      );
    }

    if (!user.job) {
      return NextResponse.json(
        { message: "Foydalanuvchining ma'lumoti topilmadi" },
        { status: 400 }
      );
    }

    const oldBolim = await prisma.bolim.findFirst({
      where: { bolim, province: user.personal.province },
    });
    if (oldBolim) {
      return NextResponse.json(
        { message: "Bu nomdagi bo'lim allaqachon mavjud" },
        { status: 400 }
      );
    }

    const newBolim = await prisma.bolim.create({
      data: {
        id: createDbId(),
        province: user.personal.province,
        bolim,
      },
    });

    return NextResponse.json(
      { message: "Bo'lim muvaffaqiyatli yaratildi", bolim: serializeBolim(newBolim) },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Bo'lim yaratishda xato:", error);
    return NextResponse.json(
      { message: 'Serverda xatolik', error: message },
      { status: 500 }
    );
  }
}
