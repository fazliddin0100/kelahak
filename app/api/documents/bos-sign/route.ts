// app/api/documents/bos-sign/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import {
  findPendingBosSignDocuments,
  serializeDocumentsForApi,
} from '@/lib/db/document';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;


    const docs = await findPendingBosSignDocuments(user.personal.province);
    const documents = await serializeDocumentsForApi(docs, {
      includeContent: false,
    });

    return NextResponse.json({ documents }, { status: 200 });
  } catch (error) {
    console.error('Hujjatlarni olishda xatolik:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
