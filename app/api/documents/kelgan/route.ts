import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/mongodb';
import {
  commanderExternalInboxWhere,
  findDocuments,
  serializeDocumentsForApi,
} from '@/lib/db/document';
import { isCommanderExternalInboxDocument } from '@/lib/documentWorkflow';
import { DocumentType } from '@/types/document';
import { type NextRequest, NextResponse } from 'next/server';

/** Komandir uchun: boshqa viloyatdan kotibiyat yuborgan hujjatlar */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;


    const province = user.personal.province;

    const raw = await findDocuments(
      commanderExternalInboxWhere(province),
      {
        includeAllowedUsers: true,
        orderBy: [{ sentToCommanderAt: 'desc' }, { updatedAt: 'desc' }],
      }
    );

    const serialized = await serializeDocumentsForApi(raw, {
      populateAuthorUser: true,
      includeContent: false,
    });

    const documents = serialized.filter((doc) =>
      isCommanderExternalInboxDocument(
        doc as unknown as DocumentType,
        province,
        userId
      )
    );

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Serverda xatolik';
    return NextResponse.json({ message: 'Serverda xatolik', error: message }, {
      status: 500,
    });
  }
}
