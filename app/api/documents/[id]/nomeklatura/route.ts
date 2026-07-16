import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { canOwnerLinkToNomeklatura } from '@/lib/documentLifecycle';
import { userCanAccessNomeklatura } from '@/lib/userNomeklatura';
import {
  findDocumentById,
  isValidDbId,
  provinceFilter,
  serializeDocumentForApi,
  updateDocument,
} from '@/lib/db/document';
import { serializeNomeklaturaPopulated } from '@/lib/db/nomeklatura';
import { DocumentStatus } from '@/types/document-status.enum';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!id || !isValidDbId(id)) {
      return NextResponse.json({ message: "Noto'g'ri ID" }, { status: 400 });
    }

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, user } = auth;

    if (!user.personal) {
      return NextResponse.json(
        { message: 'Foydalanuvchi ma\'lumoti topilmadi' },
        { status: 400 }
      );
    }

    const province = user.personal.province || '';

    const document = await findDocumentById(id);
    if (!document) {
      return NextResponse.json(
        { message: 'Hujjat topilmadi' },
        { status: 404 }
      );
    }

    const docView = serializeDocumentForApi(document);
    const isOwner = document.ownerId === userId;

    if (isOwner && !canOwnerLinkToNomeklatura(docView)) {
      if (document.status === DocumentStatus.IN_WORK_FILE) {
        return NextResponse.json(
          { message: 'Hujjat allaqachon ish jildda' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          message:
            "Avval ro'yxatga olingan nusxani qabul qiling, keyin ish jildga yuboring",
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let nomeklaturaId: string | undefined =
      body.nomenclatureId || body.nomeklaturaId;

    if (nomeklaturaId && !isValidDbId(nomeklaturaId)) {
      return NextResponse.json(
        { message: "Noto'g'ri nomeklatura ID" },
        { status: 400 }
      );
    }

    if (isOwner) {
      if (!nomeklaturaId) {
        return NextResponse.json(
          { message: 'Ish jildni ro‘yxatdan tanlang' },
          { status: 400 }
        );
      }

      const region = document.ownerRegion || province;
      const allowed = await userCanAccessNomeklatura(
        userId,
        region,
        nomeklaturaId
      );
      if (!allowed) {
        return NextResponse.json(
          { message: 'Tanlangan ish jild sizga tegishli emas' },
          { status: 403 }
        );
      }
    }

    if (!nomeklaturaId) {
      const region = document.ownerRegion || province;
      const docTitle = (document.title || '').trim();

      if (!docTitle) {
        return NextResponse.json(
          { message: 'Hujjat nomi (title) mavjud emas' },
          { status: 400 }
        );
      }

      const nomeklatura = await prisma.nomeklatura.findFirst({
        where: {
          title: { equals: docTitle, mode: 'insensitive' },
          ownerRegion: provinceFilter(region),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!nomeklatura) {
        return NextResponse.json(
          {
            message:
              'Ish jildni tanlang yoki avval nomeklatura ro‘yxatidan yarating',
          },
          { status: 404 }
        );
      }

      nomeklaturaId = nomeklatura.id;
    } else {
      const exists = await prisma.nomeklatura.findUnique({
        where: { id: nomeklaturaId },
      });
      if (!exists) {
        return NextResponse.json(
          { message: 'Nomeklatura topilmadi' },
          { status: 404 }
        );
      }
    }

    if (document.nomenclatureId === nomeklaturaId) {
      return NextResponse.json(
        { message: 'Hujjat allaqachon nomeklaturaga biriktirilgan' },
        { status: 400 }
      );
    }

    const updated = await updateDocument(id, {
      nomenclatureId: nomeklaturaId,
      status: isOwner ? DocumentStatus.IN_WORK_FILE : document.status,
    });

    const populated = await findDocumentById(updated.id, {
      includeNomenclature: true,
    });

    const serialized = serializeDocumentForApi(populated!, {
      populateNomenclature: true,
    });

    if (populated?.nomenclature) {
      serialized.nomenclatureId = serializeNomeklaturaPopulated(
        populated.nomenclature
      );
    }

    return NextResponse.json(
      {
        message: isOwner ?
          'Hujjat ish jildga yuborildi'
        : 'Hujjat nomeklaturaga muvaffaqiyatli biriktirildi',
        document: serialized,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Noma'lum xato";
    console.error('Nomeklaturaga biriktirishda xato:', error);
    return NextResponse.json(
      { message: 'Server xatosi', error: message },
      { status: 500 }
    );
  }
}
