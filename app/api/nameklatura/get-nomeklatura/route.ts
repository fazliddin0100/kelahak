import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
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

    const bolinmalar = await prisma.bolinma.findMany();
    if (!bolinmalar || bolinmalar.length === 0) {
      return NextResponse.json(
        { message: 'Bo‘linma topilmadi' },
        { status: 404 }
      );
    }

    const results = await Promise.all(
      bolinmalar.map(async (bolinma) => {
        const nomeklaturalar = await prisma.nomeklatura.findMany({
          where: {
            ownerRegion: user.personal!.province,
            bolinmaLinks: { some: { bolinmaId: bolinma.id } },
          },
          select: {
            id: true,
            registrationIndex: true,
            title: true,
            grif: true,
            status: true,
            author: true,
            saqlashMuddati: true,
            qonunTuri: true,
            ownerId: true,
            createdAt: true,
          },
        });

        return {
          _id: bolinma.id,
          bolinma: bolinma.bolinma,
          nomeklaturalar: nomeklaturalar.map((n) => ({
            registrationIndex: n.registrationIndex,
            title: n.title,
            grif: n.grif,
            status: n.status,
            author: n.author,
            saqlashMuddati: n.saqlashMuddati,
            qonunTuri: n.qonunTuri,
            owner: n.ownerId,
            createdAt: n.createdAt,
            _id: n.id,
          })),
        };
      })
    );

    return NextResponse.json(
      { message: 'Bo‘linmalar muvaffaqiyatli olindi', results },
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
