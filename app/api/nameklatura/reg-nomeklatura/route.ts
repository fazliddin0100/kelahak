import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { findUserById } from '@/lib/db/user';
import { regionsMatch } from '@/lib/documentWorkflow';
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

    const auth = await requireApiAuth(request, {
      roles: ['admin', 'superAdmin'],
    });
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

    const province = user.personal.province;
    if (
      [registrationIndex, title, grif].some(
        (value) =>
          typeof value !== 'string' || !value.trim() || value.length > 500
      )
    ) {
      return NextResponse.json(
        { message: 'Indeks, nom va grif to‘ldirilishi shart' },
        { status: 400 }
      );
    }

    const existingBolinma = await prisma.bolinma.findUnique({
      where: { id: bolinmaId },
    });
    if (!existingBolinma || !regionsMatch(existingBolinma.province, province)) {
      return NextResponse.json(
        { message: 'Bo‘linma topilmadi' },
        { status: 404 }
      );
    }

    const existingBolim = await prisma.bolim.findUnique({
      where: { id: bolimId },
    });
    if (!existingBolim || !regionsMatch(existingBolim.province, province)) {
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

    if (
      !authorUser.personal ||
      !regionsMatch(authorUser.personal.province, province)
    ) {
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
    console.error('Nomeklatura yaratishda xato:', error);
    return NextResponse.json(
      { message: 'Serverda xatolik' },
      { status: 500 }
    );
  }
}
