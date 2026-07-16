import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/mongodb';
import { canForwardReviewerSign, hasPendingForwardSignatures } from '@/lib/forwardQueue';
import { findDocuments, serializeDocumentsForApi } from '@/lib/db/document';
import { DocumentType } from '@/types/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { type NextRequest, NextResponse } from 'next/server';

/** Komandir yo'naltirgan navbat — hozir tasdiqlashi kerak bo'lgan hujjatlar */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;


    const candidates = await findDocuments({
      allowedUsers: { some: { userId } },
      status: {
        in: [
          DocumentStatus.IN_PROGRESS_FORWARD,
          DocumentStatus.IN_PROGRESS_FORWARD_REVIEW,
          DocumentStatus.SIGNED,
          DocumentStatus.FORWARDED,
        ],
      },
    }, {
      orderBy: { updatedAt: 'desc' },
    });

    const serialized = await serializeDocumentsForApi(candidates, {
      populateAuthorUser: true,
      includeContent: false,
    });

    const documents = serialized.filter((doc) => {
      const typed = doc as unknown as DocumentType;
      return (
        hasPendingForwardSignatures(typed) &&
        canForwardReviewerSign(typed, userId)
      );
    });

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Serverda xatolik';
    return NextResponse.json({ message: 'Serverda xatolik', error: message }, {
      status: 500,
    });
  }
}
