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
import { isCommanderRole } from '@/lib/roles';
import {
  isAwaitingCommanderApproval,
  isKotibiyatDirectFlow,
  isUserAuthorSigned,
} from '@/lib/documentWorkflow';
import connectToDatabase from '@/lib/prisma';
import {
  findDocumentById,
  isValidDbId,
  serializeDocumentForApi,
  updateDocument,
} from '@/lib/db/document';
import { resolveIdReference } from '@/lib/resolveIdReference';
import { DocumentStatus } from '@/types/document-status.enum';
import { NextRequest, NextResponse } from 'next/server';

type SignerJson = {
  userId?: unknown;
  hasSigned?: boolean;
  signedAt?: Date;
  viewedAt?: Date;
  [key: string]: unknown;
};

function signField(field: SignerJson | SignerJson[] | null | undefined, userId: string) {
  if (!field) return field;

  if (Array.isArray(field)) {
    return field.map((item) =>
      resolveIdReference(item.userId) === userId ?
        { ...item, hasSigned: true }
      : item
    );
  }

  if (resolveIdReference(field.userId) === userId) {
    return { ...field, hasSigned: true };
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

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;


    const roleName = user.job?.role?.role;

    const document = await findDocumentById(id, { includeAllowedUsers: true });
    if (!document) {
      return NextResponse.json(
        { message: 'Hujjat topilmadi' },
        { status: 404 }
      );
    }

    const docView = serializeDocumentForApi(document) as unknown as DocumentType;
    const pendingForwardSign = canForwardReviewerSign(docView, userId);
    const isCommander = roleName && isCommanderRole(roleName);

    if (document.status === DocumentStatus.APPROVED) {
      return NextResponse.json(
        { message: 'Hujjat allaqachon komandir tomonidan tasdiqlangan!' },
        { status: 400 }
      );
    }

    if (
      isAwaitingCommanderApproval(docView) &&
      !pendingForwardSign &&
      !isCommander
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
      isUserAuthorSigned(docView)
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

    const patch: Parameters<typeof updateDocument>[1] = {
      author: signField(document.author as SignerJson, userId),
      sender: signField(document.sender as SignerJson, userId),
      approvers: signField(document.approvers as SignerJson[], userId),
      receiver: signField(document.receiver as SignerJson[], userId),
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

    if (roleName && isCommanderRole(roleName)) {
      const commanderResult = await applyCommanderDocumentSign(
        mutableDoc as Parameters<typeof applyCommanderDocumentSign>[0],
        userId
      );
      if (commanderResult.ok) {
        await updateDocument(id, {
          bosSigned: mutableDoc.bosSigned,
          forwardedSigner: mutableDoc.forwardedSigner,
          forwardedById: mutableDoc.forwardedById ?? undefined,
          status: mutableDoc.status,
        });
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
        commanderResult.message.includes('holati')
      ) {
        return NextResponse.json(
          { message: commanderResult.message },
          { status: commanderResult.status }
        );
      }
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
            signedAt: new Date(),
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
      patch.forwardedTo = signField(forwardedTo, userId);
    }

    const isDocOwner = document.ownerId === userId;
    if (
      isDocOwner &&
      roleName === 'user' &&
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

    if (document.bosSigned && roleName && isCommanderRole(roleName)) {
      patch.bosSigned = {
        ...(document.bosSigned as SignerJson),
        hasSigned: true,
      };
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode === 'loose' ? 'loose' : 'strict';

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

    const statusMsg =
      updated.status === DocumentStatus.IN_PROGRESS ?
        "Imzo qo'yildi. Hujjat komandir ko'rib chiqishi uchun yuborildi (jarayonda)."
      : updated.status === DocumentStatus.APPROVED && isForwardReviewerSign ?
        "Navbat yakunlandi. Hujjat ro'yxatga olish uchun tayyor (imzolandi)."
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
    const message = error instanceof Error ? error.message : 'Nomaʼlum xato';
    return NextResponse.json(
      { message: 'Server xatosi', error: message },
      { status: 500 }
    );
  }
}
