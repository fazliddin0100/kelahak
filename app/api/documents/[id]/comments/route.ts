import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import {
  documentNotFoundResponse,
  isCommanderActor,
  loadViewableDocument,
} from '@/lib/documentAccess';
import { isDocumentEditableStatus } from '@/lib/documentEditRules';
import { applyCommanderCommentSignature } from '@/lib/documentForwardedSigner';
import connectToDatabase from '@/lib/prisma';
import { isValidDbId, updateDocument } from '@/lib/db/document';
import { type NextRequest, NextResponse } from 'next/server';

const MAX_COMMENT_LENGTH = 2000;

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
    const { userId } = auth;

    if (!isCommanderActor(auth)) {
      return NextResponse.json(
        { message: 'Izohni faqat komandir qoldirishi mumkin' },
        { status: 403 }
      );
    }

    const { text } = await request.json();
    const comment =
      typeof text === 'string' ? text.trim().slice(0, MAX_COMMENT_LENGTH) : '';
    if (!comment) {
      return NextResponse.json(
        { message: "Izoh matni bo'sh bo'lmasligi kerak" },
        { status: 400 }
      );
    }

    const document = await loadViewableDocument(id, auth);
    if (!document) {
      return documentNotFoundResponse();
    }

    if (!isDocumentEditableStatus(document.status)) {
      return NextResponse.json(
        { message: 'Ro‘yxatga olingan hujjatga izoh qoldirib bo‘lmaydi' },
        { status: 400 }
      );
    }

    const patch: Parameters<typeof updateDocument>[1] = {};
    await applyCommanderCommentSignature(patch, userId, comment);
    const updated = await updateDocument(id, patch);

    return NextResponse.json(
      {
        message: 'Izoh saqlandi',
        forwardedComment: updated.forwardedComment,
        forwardedAt: updated.forwardedAt,
        forwardedSigner: updated.forwardedSigner,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Izoh saqlashda xato:', error);
    return NextResponse.json({ message: 'Serverda xatolik' }, { status: 500 });
  }
}
