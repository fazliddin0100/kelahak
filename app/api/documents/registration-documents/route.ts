import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { isKotibiyatActor } from '@/lib/documentAccess';
import connectToDatabase from '@/lib/prisma';
import {
  findDocuments,
  provinceFilter,
  serializeDocumentsForApi,
} from '@/lib/db/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { type NextRequest, NextResponse } from 'next/server';

/** Forma 3 -- ro'yxatga olingan hujjatlar jurnali */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { user, userId } = auth;

    const province = user?.personal?.province;
    if (!province) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    const where: Record<string, unknown> = {
      registrationIndex: { not: null },
      status: { not: DocumentStatus.DELETED },
    };

    if (isKotibiyatActor(auth)) {
      where.OR = [
        { ownerRegion: provinceFilter(province) },
        { sourceRegion: provinceFilter(province) },
      ];
    } else {
      // Kotibiyatdan boshqalar faqat o‘ziga tegishli hujjatlarni ko‘radi
      where.OR = [
        { ownerId: userId },
        { allowedUsers: { some: { userId } } },
      ];
    }

    const documents = await findDocuments(where, {
      includeNomenclature: true,
      orderBy: [{ year: 'asc' }, { registrationIndex: 'asc' }, { updatedAt: 'asc' }],
    });

    const serialized = await serializeDocumentsForApi(documents, {
      populateAuthorUser: true,
      populateNomenclature: true,
      includeContent: false,
    });

    return NextResponse.json(
      {
        message: "Ro'yxatga olingan hujjatlar",
        documents: serialized ?? [],
        province: province ?? '',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Registration documents:', error);
    return NextResponse.json({ message: 'Server xatosi' }, {
      status: 500,
    });
  }
}
