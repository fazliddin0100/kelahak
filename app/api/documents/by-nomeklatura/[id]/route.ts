import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/prisma';
import { userCanAccessNomeklatura } from '@/lib/userNomeklatura';
import {
  findDocuments,
  isValidDbId,
  serializeDocumentsForApi,
} from '@/lib/db/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { type NextRequest, NextResponse } from 'next/server';

/** Tanlangan ish jild (nomeklatura) ichidagi `ishjildda` hujjatlar */
export async function GET(
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
    const { userId, user } = auth;

    if (!user.personal) {
      return NextResponse.json(
        { message: 'Foydalanuvchi ma\'lumoti topilmadi' },
        { status: 400 }
      );
    }

    const allowed = await userCanAccessNomeklatura(
      userId,
      user.personal.province,
      id
    );
    if (!allowed) {
      return NextResponse.json(
        { message: 'Ushbu ish jildga kirish huquqi yo‘q' },
        { status: 403 }
      );
    }

    const documents = await findDocuments(
      {
        ownerId: userId,
        nomenclatureId: id,
        status: DocumentStatus.IN_WORK_FILE,
        isCopy: { not: true },
      },
      {
        orderBy: { updatedAt: 'desc' },
      }
    );

    const serialized = await serializeDocumentsForApi(documents, {
      populateAuthorUser: true,
      includeContent: false,
    });

    return NextResponse.json({
      message: 'Ish jildidagi hujjatlar',
      nomeklaturaId: id,
      documents: serialized,
      total: serialized.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Nomaʼlum xato';
    console.error('by-nomeklatura:', error);
    return NextResponse.json(
      { message: 'Server xatosi', error: message },
      { status: 500 }
    );
  }
}
