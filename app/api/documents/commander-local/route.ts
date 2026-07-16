import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/mongodb';
import {
  commanderLocalInboxWhere,
  findDocuments,
  serializeDocumentsForApi,
} from '@/lib/db/document';
import { type NextRequest, NextResponse } from 'next/server';

/** Mahalliy user hujjatlari -- komandir ko'rib chiqishi uchun */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;


    const documents = await findDocuments(
      commanderLocalInboxWhere(user.personal.province),
      {
        orderBy: [{ sentToCommanderAt: 'desc' }, { updatedAt: 'desc' }],
      }
    );

    const serialized = await serializeDocumentsForApi(documents, {
      populateAuthorUser: true,
      includeContent: false,
    });

    return NextResponse.json({ documents: serialized }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Serverda xatolik';
    return NextResponse.json({ message: 'Serverda xatolik', error: message }, {
      status: 500,
    });
  }
}
