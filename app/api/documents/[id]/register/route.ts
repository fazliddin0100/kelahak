// app/api/documents/[id]/register/route.ts
//
// Hujjatni ro'yxatga olish va belgilangan viloyatlarga nusxalarni tarqatish.'
// Faqat admin / superAdmin / register_document huquqi bor foydalanuvchilar chaqira oladi.

import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/prisma';
import {
  isCommanderSigned,
  isKotibiyatDirectFlow,
  isKotibiyatRegistrationEligible,
  isUserAuthorSigned,
  regionsMatch,
} from '@/lib/documentWorkflow';
import {
  distributeRegionalCopies,
  resolveSourceCopyMeta,
} from '@/lib/distributeRegionalCopies';
import {
  canViewDocumentDirect,
  documentNotFoundResponse,
} from '@/lib/documentAccess';
import { isKotibiyatStaffRole } from '@/lib/roles';
import {
  findDocumentById,
  isValidDbId,
  serializeDocumentForApi,
  updateDocument,
} from '@/lib/db/document';
import { DocumentType } from '@/types/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { getRegistrationIndex } from '@/utils/registrationIndex';
import { logDocumentEvent } from '@/lib/documentEvents';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await params;
    if (!id || !isValidDbId(id)) {
      return NextResponse.json(
        { message: "Noto'g'ri hujjat ID" },
        { status: 400 }
      );
    }

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { user } = auth;

    if (!user.personal) {
      return NextResponse.json(
        { message: 'Foydalanuvchi ma\'lumoti topilmadi' },
        { status: 400 }
      );
    }
    const personal = user.personal;

    const roleRecord = user.job!.role!;

    const canRegister =
      roleRecord.role === 'admin' ||
      roleRecord.role === 'superAdmin' ||
      (Array.isArray(roleRecord.permissions) &&
        roleRecord.permissions.includes('register_document'));

    if (!canRegister) {
      return NextResponse.json(
        { message: "Ro'yxatga olish huquqi yo'q" },
        { status: 403 }
      );
    }

    const document = await findDocumentById(id, {
      includeContent: true,
      includeAttachments: true,
      includeAllowedUsers: true,
    });
    // Faqat kotibiyatga kelgan (yuborilgan yoki ulashilgan) hujjat ro'yxatga olinadi
    if (!document || !canViewDocumentDirect(document, auth)) {
      return documentNotFoundResponse();
    }

    if (document.status === DocumentStatus.REGISTERED) {
      return NextResponse.json(
        { message: "Hujjat allaqachon ro'yxatga olingan" },
        { status: 400 }
      );
    }

    if (!regionsMatch(document.ownerRegion ?? undefined, personal.province)) {
      return NextResponse.json(
        { message: 'Hujjat sizning viloyatingizga tegishli emas' },
        { status: 403 }
      );
    }

    const docView = serializeDocumentForApi(document, {
      includeContent: true,
      populateAttachments: false,
    }) as unknown as DocumentType;

    // Yangi tartib: boshliqqa yuborilgan hujjat faqat muallif va boshliq imzosidan keyin
    if (document.sentToCommander && !isKotibiyatDirectFlow(docView)) {
      if (!isUserAuthorSigned(docView)) {
        return NextResponse.json(
          { message: 'Hujjatni avval muallif imzolashi kerak' },
          { status: 400 }
        );
      }
      if (!isCommanderSigned(docView)) {
        return NextResponse.json(
          { message: 'Hujjatni avval boshliq ko‘rib chiqib imzolashi kerak' },
          { status: 400 }
        );
      }
    }

    const kotibiyatStaff = isKotibiyatStaffRole(roleRecord.role);
    if (
      !kotibiyatStaff &&
      !isKotibiyatRegistrationEligible(docView, personal.province)
    ) {
      return NextResponse.json(
        {
          message:
            "Hujjat ro'yxatga olishga tayyor emas (imzo yoki tasdiqlash jarayoni tugallanmagan)",
        },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    const registrationIndex = await getRegistrationIndex(
      personal.province,
      year,
      document.id
    );

    const { copyIndex, copyTotal } = resolveSourceCopyMeta(document.copyNumber);

    await updateDocument(id, {
      registrationIndex,
      year,
      ownerRegion: personal.province,
      status: DocumentStatus.REGISTERED,
      registeredById: auth.userId,
      registeredAt: new Date(),
      copyIndex,
      copyTotal,
      allowedUserIds: [document.ownerId],
      sharedWithAdmin: false,
      submittedToKotibiyat: false,
    });

    const sourceForCopy: Parameters<typeof distributeRegionalCopies>[0] = {
      _id: document.id,
      title: document.title ?? undefined,
      content: document.content?.content,
      grif: document.grif ?? undefined,
      author: (document.author ?? undefined) as Record<string, unknown> | undefined,
      sender: (document.sender ?? undefined) as Record<string, unknown> | undefined,
      receiver: (document.receiver ?? []) as unknown[],
      approvers: (document.approvers ?? []) as unknown[],
      attachmentText: (document.attachments ?? []).map((a) => a.attachmentId),
      copyNumber: document.copyNumber,
      owner: document.ownerId,
      ownerRegion: personal.province,
      year,
      registrationIndex,
    };

    const distributeResult =
      document.isCopy === true ?
        { created: 0, regions: [], missing: [], skipped: [] }
      : await distributeRegionalCopies(sourceForCopy, personal.province);

    await logDocumentEvent({
      documentId: document.id,
      actorId: auth.userId,
      type: 'registered',
      note: `№ ${registrationIndex}`,
    });

    const response: Record<string, unknown> = {
      message: "Hujjat muvaffaqiyatli ro'yxatga olindi",
      registrationIndex,
      year,
      regionalCopies: distributeResult.created,
      targetRegions: distributeResult.regions,
    };

    if (distributeResult.missing.length > 0) {
      response.warning =
        `Quyidagi viloyatlarda foydalanuvchi topilmadi, nusxa yuborilmadi: ` +
        distributeResult.missing.join(', ');
      response.missingRegions = distributeResult.missing;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('[register/route] Xatolik:', error);
    return NextResponse.json(
      { message: 'Ichki server xatosi' },
      { status: 500 }
    );
  }
}
