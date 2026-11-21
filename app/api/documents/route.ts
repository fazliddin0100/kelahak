import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { type NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/prisma';
import {
  createDocument,
  findDocuments,
  countDocuments,
  provinceFilter,
  serializeDocumentForApi,
  serializeDocumentsForApi,
} from '@/lib/db/document';
import { filterAttachableDocumentIds } from '@/lib/documentAccess';
import {
  resolveReceiverList,
  resolveSigner,
  resolveSignerList,
} from '@/lib/documentSigners';
import { sanitizeDocumentContent } from '@/lib/purify';
import { getUserTemplate } from '@/lib/userTemplates';
import { parseAttachmentTextIds } from '@/lib/parseAttachmentTextIds';
import { isKotibiyatStaffRole } from '@/lib/roles';
import { DocumentStatus } from '@/types/document-status.enum';

const MAX_TITLE_LENGTH = 500;
const MAX_GRIF_LENGTH = 100;
const MAX_COPY_TARGETS = 30;
const SORTABLE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'title',
  'status',
  'year',
  'registrationIndex',
]);

function cleanCopyNumber(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : [input];
  return raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, MAX_COPY_TARGETS);
}

// hujjat yaratish
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request, { permission: 'create_document' });
    if (isAuthError(auth)) return auth;
    const { userId, user } = auth;

    if (!user.personal) {
      return NextResponse.json(
        { message: 'Foydalanuvchi ma\'lumoti topilmadi' },
        { status: 400 }
      );
    }
    const personal = user.personal;

    const body = await request.json();

    // Shaxsiy namunadan yaratish: nom va shakl serverdagi namunadan olinadi
    const template =
      typeof body.templateId === 'string' && body.templateId ?
        await getUserTemplate(userId, body.templateId)
      : null;
    if (typeof body.templateId === 'string' && body.templateId && !template) {
      return NextResponse.json(
        { message: 'Hujjat namunasi topilmadi' },
        { status: 404 }
      );
    }

    const title =
      template ? template.title
      : typeof body.title === 'string' ? body.title.trim()
      : '';
    const grif = typeof body.grif === 'string' ? body.grif.trim() : '';

    if (!title) {
      return NextResponse.json(
        { message: 'Title majburiy maydon' },
        { status: 400 }
      );
    }
    if (title.length > MAX_TITLE_LENGTH || grif.length > MAX_GRIF_LENGTH) {
      return NextResponse.json(
        { message: 'Sarlavha yoki grif juda uzun' },
        { status: 400 }
      );
    }

    const roleName = user.job?.role?.role ?? '';
    const isOrdinaryUser = roleName === 'user';
    const isKotibiyatStaff = isKotibiyatStaffRole(roleName);
    const now = new Date();

    const cleanContent =
      sanitizeDocumentContent(template ? template.content : body.content) || {};

    const authorPayload = {
      userId,
      fullName:
        `${personal.fName} ${personal.name} ${personal.sName}`.trim() ||
        '',
      militaryRank: user.job?.militaryRank || '',
      position: user.job?.position || '',
      hasSigned: false,
    };

    const [approvers, sender, receiver, attachmentIds] = await Promise.all([
      resolveSignerList(body.approvers),
      resolveSigner(body.sender),
      resolveReceiverList(body.receiver),
      filterAttachableDocumentIds(
        parseAttachmentTextIds(body.attachmentText),
        auth
      ),
    ]);

    const document = await createDocument({
      title,
      content: cleanContent,
      grif,
      copyNumber: cleanCopyNumber(body.copyNumber),
      attachmentIds,
      ownerId: userId,
      status: DocumentStatus.YANGI,
      ownerRegion: personal.province,
      author: authorPayload,
      approvers,
      sender: sender ?? authorPayload,
      receiver,
      // Har qanday yaratilgan hujjat (user ham, kotibiyat ham) avval boshliqdan o'tadi:
      // muallif imzolaydi -> boshliq ko'rib chiqadi -> keyin kotibiyatga yuboriladi.
      ...(isOrdinaryUser || isKotibiyatStaff ?
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
    console.error('Hujjat yaratishda xato:', error);
    return NextResponse.json(
      { message: 'Hujjat yaratishda xatolik' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, user } = auth;

    if (!user.personal?.province) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    const userProvince = user.personal.province;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get('limit') || '10', 10) || 10)
    );
    const skip = (page - 1) * limit;

    const requestedSort = searchParams.get('sortField') || 'createdAt';
    const sortField =
      SORTABLE_FIELDS.has(requestedSort) ? requestedSort : 'createdAt';
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
