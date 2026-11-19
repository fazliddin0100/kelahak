import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/prisma';
import {
  commanderLocalInboxWhere,
  findDocuments,
  serializeDocumentsForApi,
  INBOX_LIST_LIMIT,
} from '@/lib/db/document';
import { isCommanderRole } from '@/lib/roles';
import { type NextRequest, NextResponse } from 'next/server';

/** Mahalliy user hujjatlari -- komandir ko'rib chiqishi uchun */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { user } = auth;

    if (!isCommanderRole(auth.role)) {
      return NextResponse.json(
        { message: 'Bu ro‘yxat faqat komandirlar uchun' },
        { status: 403 }
      );
    }

    if (!user.personal) {
      return NextResponse.json(
        { message: 'Foydalanuvchi ma\'lumoti topilmadi' },
        { status: 400 }
      );
    }

    const documents = await findDocuments(
      commanderLocalInboxWhere(user.personal.province),
      {
        orderBy: [{ sentToCommanderAt: 'desc' }, { updatedAt: 'desc' }],
        take: INBOX_LIST_LIMIT,
      }
    );

    const serialized = await serializeDocumentsForApi(documents, {
      populateAuthorUser: true,
      includeContent: false,
    });

    return NextResponse.json({ documents: serialized }, { status: 200 });
  } catch (error: unknown) {
    console.error('commander-local:', error);
    return NextResponse.json({ message: 'Serverda xatolik' }, { status: 500 });
  }
}
