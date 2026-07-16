import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { buildPersonalFullName } from '@/lib/forwardQueue';
import connectToDatabase from '@/lib/mongodb';
import {
  findDocumentById,
  isValidDbId,
  updateDocument,
} from '@/lib/db/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { type NextRequest, NextResponse } from 'next/server';

/** Hujjat egasi ro'yxatga olingan nusxani bir marta qabul qiladi */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;


    const fullName =
      buildPersonalFullName({
        fName: user.personal.fName,
        name: user.personal.name,
        sName: user.personal.sName,
      }) ||
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
