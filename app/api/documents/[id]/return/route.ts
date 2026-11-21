import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/prisma';
import {
  documentNotFoundResponse,
  isCommanderActor,
  loadViewableDocument,
} from '@/lib/documentAccess';
import { isAwaitingCommanderApproval } from '@/lib/documentWorkflow';
import { isValidDbId, serializeDocumentForApi, updateDocument } from '@/lib/db/document';
import { logDocumentEvent } from '@/lib/documentEvents';
import { DocumentStatus } from '@/types/document-status.enum';
import type { DocumentType } from '@/types/document';

type SignerJson = Record<string, unknown> & { userId?: unknown; hasSigned?: boolean };

const unsign = (value: unknown): SignerJson | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ?
    { ...(value as SignerJson), hasSigned: false, signedAt: null }
  : undefined;

/**
 * Boshliq hujjatni xatolari bilan muallifga qaytaradi.
 * Muallif imzosi bekor qilinadi (tuzatib, qayta imzolaydi), sabab jurnalga yoziladi.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { id } = await params;
    if (!isValidDbId(id)) return documentNotFoundResponse();

    if (!isCommanderActor(auth)) {
      return NextResponse.json({ message: 'Hujjatni faqat boshliq qaytaradi' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1000) : '';
    if (comment.length < 3) {
      return NextResponse.json({ message: 'Qaytarish sababini (xatolarni) yozing' }, { status: 400 });
    }

    const document = await loadViewableDocument(id, auth);
    if (!document) return documentNotFoundResponse();
    const docView = serializeDocumentForApi(document) as unknown as DocumentType;
    if (!isAwaitingCommanderApproval(docView)) {
      return NextResponse.json(
        { message: 'Faqat ko‘rib chiqish kutilayotgan hujjatni qaytarish mumkin' },
        { status: 400 }
      );
    }

    const author = unsign(document.author);
    const sender = document.sender as SignerJson | null;
    const senderIsAuthor =
      sender && author && String(sender.userId ?? '') === String(author.userId ?? '');

    await updateDocument(id, {
      status: DocumentStatus.YANGI,
      ...(author ? { author } : {}),
      ...(senderIsAuthor ? { sender: unsign(sender) } : {}),
      allowedUserIds: [document.ownerId],
    });
    await logDocumentEvent({
      documentId: id,
      actorId: auth.userId,
      type: 'returned',
      note: comment,
      targetUserId: document.ownerId,
    });

    return NextResponse.json({ message: 'Hujjat muallifga qaytarildi' });
  } catch (error) {
    console.error('Hujjatni qaytarishda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
