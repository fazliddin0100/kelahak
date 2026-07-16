import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { type NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import {
  createDocument,
  findDocuments,
  countDocuments,
  provinceFilter,
  serializeDocumentForApi,
  serializeDocumentsForApi,
} from '@/lib/db/document';
import { sanitizeHTML } from '@/lib/purify';
import { parseAttachmentTextIds } from '@/lib/parseAttachmentTextIds';
import { isKotibiyatStaffRole } from '@/lib/roles';
import { DocumentStatus } from '@/types/document-status.enum';

// hujjat yaratish
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

    if (!user.personal) {
      return NextResponse.json(
        { message: 'Foydalanuvchi ma\'lumoti topilmadi' },
        { status: 400 }
      );
    }
    const personal = user.personal;

        const {
      title,
      content = '',
      grif = '',
      copyNumber = [],
      attachmentText = [],
      approvers = [],
      sender = null,
      receiver = [],
    } = await request.json();

    if (!title || title.trim() === '') {
      return NextResponse.json(
        { message: 'Title majburiy maydon' },
        { status: 400 }
      );
    }

    const roleName = user.job?.role?.role ?? '';
    const isOrdinaryUser = roleName === 'user';
    const isKotibiyatStaff = isKotibiyatStaffRole(roleName);
    const now = new Date();

    const cleanContent = content.trim() ? sanitizeHTML(content) : {};

    const authorPayload = {
      userId,
      fullName:
        `${personal.fName} ${personal.name} ${personal.sName}`.trim() ||
        '',
      militaryRank: user.job?.militaryRank || '',
      position: user.job?.position || '',
      hasSigned: false,
    };

    const hasSender =
      sender &&
      typeof sender === 'object' &&
      !Array.isArray(sender) &&
      (sender as { userId?: unknown }).userId;

    const document = await createDocument({
      title: title.trim(),
      content: cleanContent,
      grif: grif.trim(),
      copyNumber: Array.isArray(copyNumber) ?
        copyNumber
      : [copyNumber].filter(Boolean),
      attachmentIds: parseAttachmentTextIds(attachmentText),
      ownerId: userId,
      status: DocumentStatus.YANGI,
      ownerRegion: personal.province,
      author: authorPayload,
      approvers: approvers || [],
      sender: hasSender ? sender : authorPayload,
      receiver: receiver || [],
      ...(isKotibiyatStaff ?
        {
          createdByKotibiyat: true,
          submittedToKotibiyat: true,
          submittedToKotibiyatAt: now,
          sharedWithAdmin: true,
          sentToCommander: false,
        }
      : isOrdinaryUser ?
        {
          sentToCommander: true,
          sentToCommanderAt: now,
        }
      : {}),
    });

    const populatedDoc = serializeDocumentForApi(document, {
      includeContent: true,
      populateOwner: true,
      populateAttachments: true,
      populateAuthorUser: true,
    });

    return NextResponse.json(populatedDoc, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Nomaʼlum xato';
    console.error('Hujjat yaratishda xato:', error);
    return NextResponse.json(
      { message: 'Hujjat yaratishda xatolik', error: message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

    if (!user.personal?.province) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    const userProvince = user.personal.province;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get('limit') || '10', 10))
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
      where.OR = [
        { ownerId: userId },
        { allowedUsers: { some: { userId } } },
      ];
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
      { status: 500 }
    );
  }
}
