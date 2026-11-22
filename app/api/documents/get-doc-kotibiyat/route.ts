import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { isKotibiyatActor } from '@/lib/documentAccess';
import {
  isKotibiyatAssignedInboxItem,
  isKotibiyatQueueVisible,
  isKotibiyatRegionalCopyInboxItem,
} from '@/lib/documentWorkflow';
import connectToDatabase, { prisma } from '@/lib/prisma';
import {
  findDocuments,
  kotibiyatRegionalCopyInboxWhere,
  kotibiyatRegistrationQueueWhere,
  serializeDocumentsForApi,
  INBOX_LIST_LIMIT,
} from '@/lib/db/document';
import { DocumentType } from '@/types/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { NextResponse, type NextRequest } from 'next/server';

const TERMINAL_QUEUE_STATUSES: DocumentStatus[] = [
  DocumentStatus.REGISTERED,
  DocumentStatus.ACCEPTED,
  DocumentStatus.ARCHIVED,
  DocumentStatus.DELETED,
];

function mergeUniqueById(
  primary: Record<string, unknown>[],
  extra: Record<string, unknown>[]
): Record<string, unknown>[] {
  const seen = new Set(primary.map((d) => String(d._id)));
  const merged = [...primary];
  for (const doc of extra) {
    const docId = String(doc._id);
    if (!seen.has(docId)) {
      merged.push(doc);
      seen.add(docId);
    }
  }
  return merged;
}

function sortBySubmittedAt(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): number {
  const ta = new Date(
    (a.submittedToKotibiyatAt as Date | string | undefined) ??
      (a.updatedAt as Date | string | undefined) ??
      0
  ).getTime();
  const tb = new Date(
    (b.submittedToKotibiyatAt as Date | string | undefined) ??
      (b.updatedAt as Date | string | undefined) ??
      0
  ).getTime();
  return tb - ta;
}

function isTerminalStatus(status?: string): boolean {
  return TERMINAL_QUEUE_STATUSES.includes(status as DocumentStatus);
}

/** Kotibiyat «Ro‘yxatga olish» navbati */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;

    if (!isKotibiyatActor(auth)) {
      return NextResponse.json(
        { message: 'Bu ro‘yxat faqat kotibiyat xodimlari uchun' },
        { status: 403 }
      );
    }

    const currentUserId = auth.userId;
    const authUser = auth.user;

    if (!authUser?.personal?.province) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    const province = authUser.personal.province;

    const [rawAssigned, rawSharedInbox, rawProvince, rawRegionalCopies] =
      await Promise.all([
        findDocuments(
          {
            submittedToKotibiyat: true,
            allowedUsers: { some: { userId: currentUserId } },
            isCopy: { not: true },
            status: { notIn: TERMINAL_QUEUE_STATUSES },
          },
          {
            includeAllowedUsers: true,
            orderBy: [{ submittedToKotibiyatAt: 'desc' }, { updatedAt: 'desc' }],
            take: INBOX_LIST_LIMIT,
          }
        ),
        findDocuments(
          {
            allowedUsers: { some: { userId: currentUserId } },
            submittedToKotibiyat: { not: true },
            ownerId: { not: currentUserId },
            isCopy: { not: true },
            status: DocumentStatus.APPROVED,
          },
          {
            includeAllowedUsers: true,
            orderBy: { updatedAt: 'desc' },
            take: INBOX_LIST_LIMIT,
          }
        ),
        findDocuments(kotibiyatRegistrationQueueWhere(province), {
          includeAllowedUsers: true,
          orderBy: [{ submittedToKotibiyatAt: 'desc' }, { updatedAt: 'desc' }],
          take: INBOX_LIST_LIMIT,
        }),
        findDocuments(kotibiyatRegionalCopyInboxWhere(province), {
          includeAllowedUsers: true,
          orderBy: [{ submittedToKotibiyatAt: 'desc' }, { updatedAt: 'desc' }],
          take: INBOX_LIST_LIMIT,
        }),
      ]);

    const [
      assignedSerialized,
      sharedSerialized,
      provinceSerialized,
      regionalSerialized,
    ] = await Promise.all([
      serializeDocumentsForApi(rawAssigned, {
        populateAuthorUser: true,
        includeContent: false,
      }),
      serializeDocumentsForApi(rawSharedInbox, {
        populateAuthorUser: true,
        includeContent: false,
      }),
      serializeDocumentsForApi(rawProvince, {
        populateAuthorUser: true,
        includeContent: false,
      }),
      serializeDocumentsForApi(rawRegionalCopies, {
        populateAuthorUser: true,
        includeContent: false,
      }),
    ]);

    const assigned = mergeUniqueById(assignedSerialized, sharedSerialized).filter(
      (doc) =>
        isKotibiyatAssignedInboxItem(
          doc as unknown as DocumentType,
          currentUserId,
          province
        )
    );

    const fromProvince = provinceSerialized.filter((doc) =>
      isKotibiyatQueueVisible(doc as unknown as DocumentType, province)
    );

    // Korxonaga yuborilgan nusxa — faqat o'sha korxona kotibiyatiga
    const myShahobchaId = authUser.job?.shahobchaId ?? null;
    const regionalCopies = regionalSerialized.filter((doc) => {
      const target = (doc as { targetShahobchaId?: string | null }).targetShahobchaId;
      if (target && target !== myShahobchaId) return false;
      return isKotibiyatRegionalCopyInboxItem(doc as unknown as DocumentType);
    });

    const documents = mergeUniqueById(
      mergeUniqueById(assigned, fromProvince),
      regionalCopies
    ).filter((d) => !isTerminalStatus(String(d.status)));

    documents.sort(sortBySubmittedAt);

    await Promise.all(
      documents
        .filter((d) => d.submittedToKotibiyat !== true)
        .map((d) =>
          prisma.document.update({
            where: { id: String(d._id) },
            data: {
              submittedToKotibiyat: true,
              sharedWithAdmin: true,
              submittedToKotibiyatAt:
                (d.submittedToKotibiyatAt as Date | undefined) ??
                (d.updatedAt as Date | undefined) ??
                new Date(),
            },
          })
        )
    );

    return NextResponse.json(
      {
        message: 'Ro‘yxatga olish uchun kelgan hujjatlar',
        documents,
        province,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Kotibiyat hujjatlari:', error);
    return NextResponse.json(
      { message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
