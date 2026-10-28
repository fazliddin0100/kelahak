import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { buildPersonalFullName } from '@/lib/forwardQueue';
import connectToDatabase from '@/lib/prisma';
import {
  findDocumentById,
  isValidDbId,
  updateDocument,
} from '@/lib/db/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { type NextRequest, NextResponse } from 'next/server';

type SignerSnapshot = {
  fullName?: string;
  militaryRank?: string;
  position?: string;
};

/** Hujjat egasi ro'yxatga olingan nusxani bir marta qabul qiladi */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await context.params;
    if (!id || !isValidDbId(id)) {
      return NextResponse.json({ message: "Noto'g'ri ID" }, { status: 400 });
    }

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, user } = auth;

    const document = await findDocumentById(id);
    if (!document) {
      return NextResponse.json(
        { message: 'Hujjat topilmadi' },
        { status: 404 }
      );
    }

    if (document.ownerId !== userId) {
      return NextResponse.json(
        { message: 'Faqat hujjat egasi qabul qila oladi' },
        { status: 403 }
      );
    }

    const author = document.author as SignerSnapshot | null;
    const personal = user.personal;

    const fullName =
      (personal ?
        buildPersonalFullName({
          fName: personal.fName,
          name: personal.name,
          sName: personal.sName,
        })
      : null) ||
      author?.fullName ||
      '';

    const now = new Date();
    const ownerAcceptedBy = {
      userId,
      fullName,
      militaryRank: user.job?.militaryRank ?? author?.militaryRank ?? '',
      position: user.job?.position ?? author?.position ?? '',
      hasSigned: true,
      signedAt: now,
    };

    await updateDocument(id, {
      ownerAccepted: true,
      ownerAcceptedAt: now,
      ownerAcceptedBy,
      status: DocumentStatus.ACCEPTED,
    });

    return NextResponse.json(
      {
        message: 'Hujjat qabul qilindi',
        status: DocumentStatus.ACCEPTED,
        ownerAccepted: true,
        ownerAcceptedAt: now,
        ownerAcceptedBy,
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
