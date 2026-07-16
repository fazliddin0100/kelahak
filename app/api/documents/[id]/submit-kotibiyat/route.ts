import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/mongodb';
import { hasPendingForwardSignatures } from '@/lib/forwardQueue';
import { assertKotibiyatRecipient } from '@/lib/kotibiyatStaff';
import {
  canUserSubmitToKotibiyat,
  isCommanderSigned,
  isUserAuthorSigned,
} from '@/lib/documentWorkflow';
import { DocumentType } from '@/types/document';
import {
  findDocumentById,
  isValidDbId,
  serializeDocumentForApi,
  updateDocument,
} from '@/lib/db/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { type NextRequest, NextResponse } from 'next/server';

/** User komandir tasdiqlagach tanlangan kotibiyat xodimiga yuboradi */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;


    const { id } = await context.params;
    if (!id || !isValidDbId(id)) {
      return NextResponse.json({ message: 'Noto‘g‘ri ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const kotibiyatUserId =
      typeof body.kotibiyatUserId === 'string' ? body.kotibiyatUserId.trim() : '';

    if (!kotibiyatUserId || !isValidDbId(kotibiyatUserId)) {
      return NextResponse.json(
        { message: 'Kotibiyat qabul qiluvchisini tanlang' },
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

    if (document.ownerId !== userId) {
      return NextResponse.json(
        { message: 'Faqat hujjat egasi kotibiyatga yuborishi mumkin' },
        { status: 403 }
      );
    }

    if (document.submittedToKotibiyat) {
      return NextResponse.json(
        { message: 'Hujjat allaqachon kotibiyatga yuborilgan' },
        { status: 400 }
      );
    }

    const patch: Parameters<typeof updateDocument>[1] = {};

    if (!document.sentToCommander) {
      patch.sentToCommander = true;
      if (!document.sentToCommanderAt) {
        patch.sentToCommanderAt = new Date();
      }
    }

    const docView = serializeDocumentForApi({
      ...document,
      ...patch,
    }) as DocumentType;

    if (!canUserSubmitToKotibiyat(docView)) {
      if (!isUserAuthorSigned(docView)) {
        return NextResponse.json(
          { message: 'Avval hujjatni imzolang' },
          { status: 400 }
        );
      }
      if (!isCommanderSigned(docView)) {
        return NextResponse.json(
          {
            message:
              'Komandir hujjatni tasdiqlaguncha kotibiyatga yuborib bo‘lmaydi',
          },
          { status: 400 }
        );
      }
      if (hasPendingForwardSignatures(docView)) {
        return NextResponse.json(
          {
            message:
              'Komandir yo‘naltirgan barcha xodimlar tasdiqlaguncha kuting',
          },
          { status: 400 }
        );
      }
      if (document.status !== DocumentStatus.APPROVED) {
        return NextResponse.json(
          {
            message:
              'Komandir hujjatni tasdiqlaguncha kotibiyatga yuborib bo‘lmaydi',
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { message: 'Hujjatni hozircha kotibiyatga yuborib bo‘lmaydi' },
        { status: 400 }
      );
    }

    const recipientCheck = await assertKotibiyatRecipient(
      kotibiyatUserId,
      document.ownerRegion ?? ''
    );
    if (!recipientCheck.ok) {
      return NextResponse.json(
        { message: recipientCheck.message },
        { status: 400 }
      );
    }

    patch.submittedToKotibiyat = true;
    patch.submittedToKotibiyatAt = new Date();
    patch.sharedWithAdmin = true;
    patch.allowedUserIds = [...new Set([userId, kotibiyatUserId, document.ownerId])];

    await updateDocument(id, patch);

    return NextResponse.json(
      {
        message: 'Hujjat kotibiyatga ro‘yxatga olish uchun yuborildi',
        submittedToKotibiyat: true,
        kotibiyatUserId,
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
