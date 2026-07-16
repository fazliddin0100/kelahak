import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { findUserById } from '@/lib/db/user';
import connectToDatabase, { prisma } from '@/lib/prisma';
import {
  createDbId,
  isValidDbId,
  NomeklaturaStatus,
  serializeNomeklatura,
} from '@/lib/db/nomeklatura';
import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      registrationIndex,
      title,
      grif,
      saqlashMuddati,
      qonunTuri,
      bolinma,
      bolim,
      author,
    } = body;

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

    if (!user.personal) {
      return NextResponse.json(
        { message: "Foydalanuvchining ma'lumoti topilmadi" },
        { status: 400 }
      );
    }

    const bolinmaId = String(Array.isArray(bolinma) ? bolinma[0] : bolinma);
    const bolimId = String(Array.isArray(bolim) ? bolim[0] : bolim);

    const existingBolinma = await prisma.bolinma.findUnique({
      where: { id: bolinmaId },
    });
    if (!existingBolinma) {
      return NextResponse.json(
        { message: 'Bo‘linma topilmadi' },
        { status: 404 }
      );
    }

    const existingBolim = await prisma.bolim.findUnique({
      where: { id: bolimId },
    });
    if (!existingBolim) {
      return NextResponse.json(
        { message: 'Bo‘lim topilmadi' },
        { status: 404 }
      );
    }

    const authorUserId = author?.userId;
    if (!authorUserId || !isValidDbId(String(authorUserId))) {
      return NextResponse.json(
        { message: 'Javobgar shaxs tanlanishi shart' },
        { status: 400 }
      );
    }

    const authorUser = await findUserById(String(authorUserId));
    if (!authorUser) {
      return NextResponse.json(
        { message: 'Javobgar foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    if (!authorUser.personal) {
      return NextResponse.json(
        { message: 'Javobgar shaxs personal ma’lumoti topilmadi' },
        { status: 400 }
      );
    }

    if (!authorUser.job) {
      return NextResponse.json(
        { message: 'Javobgar shaxs lavozim ma’lumoti topilmadi' },
        { status: 400 }
      );
    }

    const authorPayload = {
      userId: authorUser.id,
      fullName:
        author?.fullName?.trim() ||
        `${authorUser.personal.fName} ${authorUser.personal.name} ${authorUser.personal.sName}`.trim(),
      militaryRank: authorUser.job.militaryRank || '—',
      position: authorUser.job.position || '—',
      department: authorUser.job.department || authorUser.job.organ || '—',
      province: authorUser.personal.province || user.personal.province,
    };

    const id = createDbId();
    const newNomeklatura = await prisma.nomeklatura.create({
      data: {
        id,
        registrationIndex,
        title,
        grif,
        saqlashMuddati: saqlashMuddati as Prisma.InputJsonValue,
        qonunTuri: qonunTuri || '',
        ownerId: authorUser.id,
        creatorId: user.id,
        ownerRegion: user.personal.province,
        author: authorPayload as Prisma.InputJsonValue,
        status: NomeklaturaStatus.CREATED,
        bolimLinks: { create: { bolimId: existingBolim.id } },
        bolinmaLinks: { create: { bolinmaId: existingBolinma.id } },
      },
    });

    return NextResponse.json(
      {
        message: 'Nomeklatura muvaffaqiyatli yaratildi',
        nomeklatura: serializeNomeklatura(newNomeklatura, {
          bolimIds: [existingBolim.id],
          bolinmaIds: [existingBolinma.id],
        }),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error('Nomeklatura yaratishda xato:', error);
    return NextResponse.json(
      { message: 'Serverda xatolik', error: message },
      { status: 500 }
    );
  }
}
