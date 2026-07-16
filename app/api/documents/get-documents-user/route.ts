// app/api/documents/get-documents-user/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/mongodb';
import {
  countDocuments,
  findDocuments,
  provinceFilter,
  serializeDocumentsForApi,
} from '@/lib/db/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

    if (!user.personal?.province) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 },
      );
    }

    const userProvince = user.personal.province;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get('limit') || '10', 10)),
    );
    const skip = (page - 1) * limit;

    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
    const scope = searchParams.get('scope') || 'all';
    const includeWorkFile = searchParams.get('includeWorkFile') === '1';

    const where: Record<string, unknown> = {
      ownerRegion: provinceFilter(userProvince),
    };

    if (!includeWorkFile) {
      where.status = { not: DocumentStatus.IN_WORK_FILE };
    }

    if (scope === 'owner') {
      where.ownerId = userId;
    } else {
      where.OR = [{ ownerId: userId }, { allowedUsers: { some: { userId } } }];
    }

    const orderBy = {
      [sortField]: sortOrder,
    } as { createdAt?: 'asc' | 'desc'; updatedAt?: 'asc' | 'desc' };

    const [documents, totalDocuments] = await Promise.all([
      findDocuments(where, {
        orderBy,
        skip,
        take: limit,
        includeAllowedUsers: true,
        includeOwner: true,
      }),
      countDocuments(where),
    ]);

    const totalPages = Math.ceil(totalDocuments / limit);

    const serialized = await serializeDocumentsForApi(documents, {
      populateOwner: true,
      populateAuthorUser: true,
      includeContent: false,
    });

    const documentsWithMeta = serialized.map((doc) => ({
      ...doc,
      sharedForView:
        String((doc.owner as { _id?: string })?._id ?? doc.owner) !== userId &&
        Array.isArray(doc.allowedUsers) &&
        doc.allowedUsers.some((uid) => String(uid) === userId),
    }));

    return NextResponse.json({
      page,
      limit,
      totalPages,
      totalDocuments,
      documents: documentsWithMeta,
    });
  } catch (error) {
    console.error('GET documents error:', error);
    return NextResponse.json(
      { message: 'Serverda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
