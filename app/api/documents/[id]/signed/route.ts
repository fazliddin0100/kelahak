// app/api/documents/[id]/signed/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { applyCommanderDocumentSign } from '@/lib/commanderSignDocument';
import { canMarkDocumentFullySigned } from '@/lib/documentSignRules';
import {
  advanceForwardQueueAfterSign,
  canForwardReviewerSign,
  completeForwardWorkflowIfReady,
  findQueueEntryForUser,
} from '@/lib/forwardQueue';
import { DocumentType } from '@/types/document';
import { isCommanderRole, isKotibiyatStaffRole } from '@/lib/roles';
import {
  actorProvince,
  documentNotFoundResponse,
  loadViewableDocument,
} from '@/lib/documentAccess';
import {
  isAwaitingCommanderApproval,
  isKotibiyatDirectFlow,
  isUserAuthorSigned,
  regionsMatch,
} from '@/lib/documentWorkflow';
import connectToDatabase from '@/lib/prisma';
import { hasSigningCertificate, SIGN_CERT_REQUIRED_MESSAGE } from '@/lib/eimzo/challenge';
import {
  DocumentSignError,
  saveDocumentSignature,
  verifyDocumentSignRequest,
  type VerifiedDocumentSignature,
} from '@/lib/eimzo/documentSign';
import {
  isValidDbId,
  serializeDocumentForApi,
  updateDocument,
} from '@/lib/db/document';
import { resolveIdReference } from '@/lib/resolveIdReference';
import { DocumentStatus } from '@/types/document-status.enum';
import { logDocumentEvent } from '@/lib/documentEvents';
import { getSignerMeta, type SignerMeta } from '@/lib/documentSignerMeta';
import { NextRequest, NextResponse } from 'next/server';

type SignerJson = {
  userId?: unknown;
  hasSigned?: boolean;
  signedAt?: Date;
  viewedAt?: Date;
  [key: string]: unknown;
};

function hasUnsignedEntry(field: unknown, userId: string): boolean {
  const entries =
    Array.isArray(field) ? field
    : field && typeof field === 'object' ? [field]
    : [];
  return entries.some(
    (entry) =>
      entry &&
      typeof entry === 'object' &&
      resolveIdReference((entry as SignerJson).userId) === userId &&
      (entry as SignerJson).hasSigned !== true
  );
}

/** Userning imzolanmagan qatorlarini belgilaydi: imzo vaqti va tashkiloti QR kod uchun yoziladi */
function signField(
  field: SignerJson | SignerJson[] | null | undefined,
  userId: string,
  meta: SignerMeta
) {
  if (!field) return field;
  const mark = (item: SignerJson): SignerJson =>
    item.hasSigned === true ?
      item
    : { ...item, hasSigned: true, signedAt: meta.signedAt, organization: meta.organization };

  if (Array.isArray(field)) {
    return field.map((item) => (resolveIdReference(item.userId) === userId ? mark(item) : item));
  }

  if (resolveIdReference(field.userId) === userId) {
    return mark(field);
  }

  return field;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    if (!id || !isValidDbId(id)) {
      return NextResponse.json({ message: "Noto'g'ri ID" }, { status: 400 });
    }

    const auth = await requireApiAuth(request, { permission: 'sign_document' });
    if (isAuthError(auth)) return auth;
    const { userId, user } = auth;

    const roleName = user.job?.role?.role;

    const document = await loadViewableDocument(id, auth);
    if (!document) {
      return documentNotFoundResponse();
    }

    // Har bir user hujjatni faqat o'zining E-IMZO kaliti bilan imzolaydi (sertifikatsiz — taqiq)
    if (!(await hasSigningCertificate(userId))) {
      return NextResponse.json({ message: SIGN_CERT_REQUIRED_MESSAGE, code: 'EIMZO_CERT_REQUIRED' }, { status: 403 });
    }
    let eimzoSignature: VerifiedDocumentSignature;
    {
      const body = (await request.json().catch(() => null)) as { eimzo?: unknown } | null;
      try {
        eimzoSignature = await verifyDocumentSignRequest(request, userId, id, body?.eimzo);
      } catch (e) {
        if (e instanceof DocumentSignError) {
          return NextResponse.json({ message: e.message, code: e.code }, { status: e.status });
        }
        throw e;
      }
    }

    const docView = serializeDocumentForApi(document) as unknown as DocumentType;
    const pendingForwardSign = canForwardReviewerSign(docView, userId);
    /** Komandir sifatida imzo: faqat o‘z viloyati hujjati yoki o‘zi yo‘naltirgan hujjat */
    const isCommander =
      !!roleName &&
      isCommanderRole(roleName) &&
      (regionsMatch(document.ownerRegion, actorProvince(auth)) ||
        document.forwardedById === userId);
    const canSignAsParticipant = [
      document.author,
      document.sender,
      document.approvers,
      document.receiver,
      document.forwardedTo,
    ].some((field) => hasUnsignedEntry(field, userId));

    // Boshliq tasdiqlagan hujjatni faqat rezolyutsiya ijrochisi «Tanishdim» deb imzolaydi
    if (document.status === DocumentStatus.APPROVED && !pendingForwardSign) {
      return NextResponse.json(
        { message: 'Hujjat allaqachon komandir tomonidan tasdiqlangan!' },
        { status: 400 }
      );
    }

    // Userning imzolanmagan joyi (masalan, yuboruvchi) qolgan bo'lsa — imzolashga ruxsat
    if (
      isAwaitingCommanderApproval(docView) &&
      !pendingForwardSign &&
      !isCommander &&
      !canSignAsParticipant
    ) {
      return NextResponse.json(
        {
          message:
            'Siz allaqachon imzolagansiz. Komandir tasdiqlashi kutilmoqda.',
        },
        { status: 400 }
      );
    }

    if (
      document.status === DocumentStatus.SIGNED &&
      !pendingForwardSign &&
      !isCommander &&
      isUserAuthorSigned(docView) &&
      !canSignAsParticipant
    ) {
      return NextResponse.json(
        {
          message:
            'Siz allaqachon imzolagansiz. Komandir tasdiqlashi kutilmoqda.',
        },
        { status: 400 }
      );
    }

    const queueEntry = findQueueEntryForUser(docView, userId);
    if (
      queueEntry &&
      !queueEntry.hasSigned &&
      !canForwardReviewerSign(docView, userId)
    ) {
      return NextResponse.json(
        { message: 'Navbatda oldingi foydalanuvchi tasdiqlashi kutilmoqda' },
        { status: 403 }
      );
    }

    const meta = await getSignerMeta(userId);
    const patch: Parameters<typeof updateDocument>[1] = {
      author: signField(document.author as SignerJson, userId, meta),
      sender: signField(document.sender as SignerJson, userId, meta),
      approvers: signField(document.approvers as SignerJson[], userId, meta),
      receiver: signField(document.receiver as SignerJson[], userId, meta),
    };

    const mutableDoc = {
      sharedWithAdmin: document.sharedWithAdmin,
      sentToCommander: document.sentToCommander,
      forwardedById: document.forwardedById,
      status: document.status,
      forwardedTo: document.forwardedTo,
      bosSigned: document.bosSigned,
      forwardedSigner: document.forwardedSigner,
    };

    if (isCommander) {
      const commanderResult = await applyCommanderDocumentSign(
        mutableDoc as Parameters<typeof applyCommanderDocumentSign>[0],
        userId,
        meta.organization
      );
      if (commanderResult.ok) {
        await updateDocument(id, {
          // Boshliq hujjatda yuboruvchi/kelishuvchi sifatida ham yozilgan bo'lsa — o'sha qatorda ham QR chiqadi
          author: patch.author,
          sender: patch.sender,
          approvers: patch.approvers,
          receiver: patch.receiver,
          bosSigned: mutableDoc.bosSigned,
          forwardedSigner: mutableDoc.forwardedSigner,
          forwardedById: mutableDoc.forwardedById ?? undefined,
          status: mutableDoc.status,
        });
        if (eimzoSignature) await saveDocumentSignature(id, userId, eimzoSignature);
        await logDocumentEvent({ documentId: id, actorId: userId, type: 'commander_signed' });
        return NextResponse.json(
          {
            message: 'Komandir hujjatni imzoladi',
            status: mutableDoc.status,
          },
          { status: 200 }
        );
      }
      if (
        commanderResult.status !== 400 ||
        commanderResult.message.includes('holati') ||
        !canSignAsParticipant
      ) {
        return NextResponse.json(
          { message: commanderResult.message },
          { status: commanderResult.status }
        );
      }
    }

    if (!canSignAsParticipant) {
      return NextResponse.json(
        {
          message:
            'Siz bu hujjatning imzolovchilari qatorida emassiz yoki allaqachon imzolagansiz',
        },
        { status: 403 }
      );
    }

    const isForwardReviewerSign = canForwardReviewerSign(docView, userId);
    let forwardedTo = document.forwardedTo as SignerJson[] | null;

    if (Array.isArray(forwardedTo)) {
      let markedForward = false;
      forwardedTo = forwardedTo.map((item) => {
        if (resolveIdReference(item.userId) === userId) {
          markedForward = true;
          return {
            ...item,
            hasSigned: true,
            signedAt: meta.signedAt,
            organization: meta.organization,
            viewedAt: item.viewedAt ?? new Date(),
          };
        }
        return item;
      });
      patch.forwardedTo = forwardedTo;
      if (markedForward) {
        const queueDoc = {
          status: document.status,
          forwardedTo,
          bosSigned: document.bosSigned,
          forwardedSigner: document.forwardedSigner,
          currentViewIndex: document.currentViewIndex,
        };
        advanceForwardQueueAfterSign(
          queueDoc as Parameters<typeof advanceForwardQueueAfterSign>[0]
        );
        completeForwardWorkflowIfReady(
          queueDoc as unknown as Parameters<typeof completeForwardWorkflowIfReady>[0]
        );
        patch.currentViewIndex = queueDoc.currentViewIndex;
        patch.status = queueDoc.status;
        if ('resolvedAt' in queueDoc) {
          patch.resolvedAt = (queueDoc as { resolvedAt?: Date }).resolvedAt;
        }
        patch.bosSigned = queueDoc.bosSigned;
      }
    } else {
      patch.forwardedTo = signField(forwardedTo, userId, meta);
    }

    const isDocOwner = document.ownerId === userId;
    if (
      isDocOwner &&
      (roleName === 'user' || isKotibiyatStaffRole(roleName)) &&
      patch.author &&
      typeof patch.author === 'object' &&
      !Array.isArray(patch.author) &&
      (patch.author as SignerJson).hasSigned
    ) {
      patch.sentToCommander = true;
      if (!document.sentToCommanderAt) {
        patch.sentToCommanderAt = new Date();
      }
    }

    const mode = 'strict' as const;

    const previewDoc = serializeDocumentForApi({
      ...document,
      ...patch,
    } as import('@/lib/db/document').DocumentWithRelations) as unknown as DocumentType;

    const signedCondition = canMarkDocumentFullySigned(
      previewDoc as unknown as Parameters<typeof canMarkDocumentFullySigned>[0],
      mode,
      {
        isForwardReviewerSign,
      }
    );

    if (signedCondition && !isForwardReviewerSign) {
      const commanderFlow =
        document.sentToCommander === true && !isKotibiyatDirectFlow(previewDoc);

      if (commanderFlow && isUserAuthorSigned(previewDoc)) {
        patch.status = DocumentStatus.IN_PROGRESS;
        patch.allowedUserIds = [document.ownerId];
      } else if (!commanderFlow) {
        patch.status = DocumentStatus.SIGNED;
        patch.allowedUserIds = [document.ownerId];
      }
    }

    const updated = await updateDocument(id, patch);
    if (eimzoSignature) await saveDocumentSignature(id, userId, eimzoSignature);
    await logDocumentEvent({
      documentId: id,
      actorId: userId,
      type: isForwardReviewerSign ? 'acknowledged' : 'author_signed',
    });

    const statusMsg =
      updated.status === DocumentStatus.IN_PROGRESS ?
        "Imzo qo'yildi. Hujjat boshliq ko'rib chiqishi uchun yuborildi."
      : isForwardReviewerSign ?
        "Hujjat bilan tanishdingiz (imzolandi)."
      : updated.status === DocumentStatus.APPROVED ?
        'Hujjat tasdiqlandi (imzolandi)'
      : signedCondition ?
        "Hujjat to'liq imzolandi"
      : "Imzo qo'yildi, lekin hamma imzo yig'ilmadi";

    return NextResponse.json(
      {
        message: statusMsg,
        status: updated.status,
        mode,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Hujjatni imzolashda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
