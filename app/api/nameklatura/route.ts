// app/api/nameklatura/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { type NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { createDbId } from '@/lib/db/nomeklatura';

// create bolim
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { bolim } = await request.json();
    if (!bolim) {
      return NextResponse.json(
        { message: "Barcha maydonlar to'ldirilishi kerak" },
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

    const findBolim = await prisma.bolim.findFirst({ where: { bolim } });
    if (findBolim) {
      return NextResponse.json({ message: "Bo'lim mavjud" }, { status: 404 });
    }

    await prisma.bolim.create({
      data: {
        id: createDbId(),
        bolim,
        province: user.personal.province,
      },
    });

    return NextResponse.json("Bo'lim yaratildi", { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Hujjat yaratishda xato:', error);
    return NextResponse.json(
      { message: 'Hujjat yaratishda xatolik', error: message },
      { status: 500 }
    );
  }
}
