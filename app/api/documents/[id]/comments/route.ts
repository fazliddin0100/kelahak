import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { applyCommanderCommentSignature } from '@/lib/documentForwardedSigner';
import connectToDatabase from '@/lib/prisma';
import { findDocumentById, isValidDbId, updateDocument } from '@/lib/db/document';
import { type NextRequest, NextResponse } from 'next/server';

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
    const { userId, role, user, department } = auth;


    const { text } = await request.json();
    if (!text || !String(text).trim()) {
      return NextResponse.json(
        { message: "Izoh matni bo'sh bo'lmasligi kerak" },
        { status: 400 }
      );
    }

    const document = await findDocumentById(id);
    if (!document) {
      return NextResponse.json(
        { message: 'Hujjat topilmadi' },
        { status: 404 }
      );
    }

    const patch: Parameters<typeof updateDocument>[1] = {};
    await applyCommanderCommentSignature(patch, userId, String(text));
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
    const message = error instanceof Error ? error.message : 'Serverda xatolik';
    return NextResponse.json({ message: 'Serverda xatolik', error: message }, {
      status: 500,
    });
  }
}
