import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { createDbId, serializeBolinma } from '@/lib/db/nomeklatura';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { bolinma } = body;

    if (!bolinma) {
      return NextResponse.json(
        { message: "Bo'linma field is required" },
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

    const oldBolinma = await prisma.bolinma.findFirst({ where: { bolinma } });
    if (oldBolinma) {
      return NextResponse.json(
        { message: "Bu bo'linma allaqachon mavjud" },
        { status: 400 }
      );
    }

    const newBolinma = await prisma.bolinma.create({
      data: {
        id: createDbId(),
        province: user.personal.province || 'Unknown',
        bolinma,
      },
    });

    return NextResponse.json(
      {
        message: "Bo'linma muvaffaqiyatli yaratildi",
        bolinma: serializeBolinma(newBolinma),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Xatolik:', error);
    return NextResponse.json(
      { message: 'Serverda xatolik', error: message },
      { status: 500 }
    );
  }
}
