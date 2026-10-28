import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
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
    const { user } = auth;

    const province = user?.personal?.province;

    const where: Record<string, unknown> = {
      registrationIndex: { not: null },
      status: { not: DocumentStatus.DELETED },
    };

    if (province) {
      where.OR = [
        { ownerRegion: provinceFilter(province) },
        { sourceRegion: provinceFilter(province) },
        {
          owner: {
            personal: { province: provinceFilter(province) },
          },
        },
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
    const message = error instanceof Error ? error.message : 'Server xatosi';
    console.error('Registration documents:', error);
    return NextResponse.json({ message: 'Server xatosi', error: message }, {
      status: 500,
    });
  }
}
