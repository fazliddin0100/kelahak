import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

        if (!user.personal) {
      return NextResponse.json(
        { message: 'Personal topilmadi' },
        { status: 404 }
      );
    }

    const province = user.personal.province;

    const usersInProvince = await prisma.user.findMany({
      where: { personal: { province } },
      select: { job: { select: { organ: true } } },
    });

    const organs = [
      ...new Set(
        usersInProvince
          .map((u) => u.job?.organ)
          .filter((organ): organ is string => Boolean(organ?.trim()))
      ),
    ];

    return NextResponse.json(
      {
        province,
        organs,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        message: 'Xatolik',
        error: message,
      },
      { status: 500 }
    );
  }
}
