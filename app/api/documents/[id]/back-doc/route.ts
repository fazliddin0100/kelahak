// app/api/documents/[id]/back-doc/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/prisma';
import { isValidDbId, updateDocument } from '@/lib/db/document';
import {
  canViewDocumentDirect,
  documentNotFoundResponse,
  isKotibiyatActor,
  loadViewableDocument,
} from '@/lib/documentAccess';
import { isDocumentEditableStatus } from '@/lib/documentEditRules';

/** Kotibiyat hujjatni ro‘yxatga olmasdan egasiga qaytaradi */
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

    const document = await loadViewableDocument(id, auth);
    if (!document) {
      return documentNotFoundResponse();
    }

    const isOwner = document.ownerId === auth.userId;
    const isKotibiyatOfDocument =
      isKotibiyatActor(auth) && canViewDocumentDirect(document, auth);
    if (!isOwner && !isKotibiyatOfDocument) {
      return NextResponse.json(
        { message: 'Hujjatni faqat kotibiyat egasiga qaytarishi mumkin' },
        { status: 403 }
      );
    }

    if (!isDocumentEditableStatus(document.status)) {
      return NextResponse.json(
        { message: 'Ro‘yxatga olingan hujjatni qaytarib bo‘lmaydi' },
        { status: 400 }
      );
    }

    await updateDocument(document.id, {
      sharedWithAdmin: false,
      submittedToKotibiyat: false,
      submittedToKotibiyatAt: null,
      allowedUserIds: [document.ownerId],
    });

    return NextResponse.json(
      { message: 'Hujjat egasiga qaytarildi' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Xatolik:', error);
    return NextResponse.json(
      { message: 'Ichki server xatosi' },
      { status: 500 }
    );
  }
}
