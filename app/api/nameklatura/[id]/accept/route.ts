import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { isValidDbId, NomeklaturaStatus } from '@/lib/db/nomeklatura';
import { canUserAcceptNomeklatura } from '@/lib/userNomeklatura';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;


    const { id } = await context.params;
    if (!id || !isValidDbId(id)) {
      return NextResponse.json(
        { message: 'Noto‘g‘ri nomeklatura identifikatori' },
        { status: 400 }
      );
    }

    const nomeklatura = await prisma.nomeklatura.findUnique({ where: { id } });
    if (!nomeklatura) {
      return NextResponse.json(
        { message: 'Nomeklatura topilmadi' },
        { status: 404 }
      );
    }

    if (
      !canUserAcceptNomeklatura(
        {
          status: nomeklatura.status,
          ownerId: nomeklatura.ownerId,
          author: nomeklatura.author as { userId?: string },
        },
        userId
      )
    ) {
      return NextResponse.json(
        { message: 'Faqat javobgar foydalanuvchi qabul qilishi mumkin' },
        { status: 403 }
      );
    }

    if (nomeklatura.status === NomeklaturaStatus.ARCHIVED) {
      return NextResponse.json(
        { message: 'Arxivdagi nomeklaturani qabul qilib bo‘lmaydi' },
        { status: 400 }
      );
    }

    if (nomeklatura.status === NomeklaturaStatus.APPROVED) {
      return NextResponse.json(
        {
          message: 'Nomeklatura allaqachon imzolangan',
          status: NomeklaturaStatus.APPROVED,
        },
        { status: 200 }
      );
    }

    await prisma.nomeklatura.update({
      where: { id },
      data: { status: NomeklaturaStatus.APPROVED },
    });

    return NextResponse.json(
      {
        message: 'Nomeklatura qabul qilindi (imzolangan)',
        status: NomeklaturaStatus.APPROVED,
        _id: id,
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
