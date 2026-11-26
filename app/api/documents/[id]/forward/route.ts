import { getSignerMeta } from '@/lib/documentSignerMeta';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { applyCommanderCommentSignature } from '@/lib/documentForwardedSigner';
import { buildPersonalFullName } from '@/lib/forwardQueue';
import connectToDatabase from '@/lib/prisma';
import { isSameUnitAsCommander } from '@/lib/unitPeerMatch';
import {
  documentNotFoundResponse,
  isCommanderActor,
  loadViewableDocument,
} from '@/lib/documentAccess';
import { isDocumentEditableStatus } from '@/lib/documentEditRules';
import {
  findDocumentById,
  isValidDbId,
  serializeDocumentForApi,
  updateDocument,
} from '@/lib/db/document';
import { findUserById, findUsersByIds } from '@/lib/db/user';
import { DocumentStatus } from '@/types/document-status.enum';
import type { DocumentType } from '@/types/document';
import { isAwaitingCommanderApproval } from '@/lib/documentWorkflow';
import { applyCommanderDocumentSign } from '@/lib/commanderSignDocument';
import { isEimzoRequired } from '@/lib/eimzo/challenge';
import {
  DocumentSignError,
  saveDocumentSignature,
  verifyDocumentSignRequest,
  type VerifiedDocumentSignature,
} from '@/lib/eimzo/documentSign';
import { logDocumentEvent } from '@/lib/documentEvents';
import { type NextRequest, NextResponse } from 'next/server';

const MAX_COMMENT_LENGTH = 2000;
const MAX_QUEUE_LENGTH = 50;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request, { permission: 'send_document' });
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;
    const currentUserId = userId;


    const { id } = await context.params;
    if (!id || !isValidDbId(id)) {
      return NextResponse.json({ message: "Noto'g'ri ID" }, { status: 400 });
    }

    if (!isCommanderActor(auth)) {
      return NextResponse.json(
        { message: 'Hujjatni faqat komandir yo‘naltirishi mumkin' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const comment =
      typeof body.comment === 'string' ?
        body.comment.trim().slice(0, MAX_COMMENT_LENGTH)
      : '';
    const userIds: string[] = [
      ...new Set(
        (Array.isArray(body.userIds) ? body.userIds : []).filter(
          (uid: unknown): uid is string =>
            typeof uid === 'string' && isValidDbId(uid)
        )
      ),
    ].slice(0, MAX_QUEUE_LENGTH) as string[];

    if (userIds.length === 0) {
      return NextResponse.json(
        { message: 'Kamida bitta foydalanuvchi tanlang' },
        { status: 400 }
      );
    }

    const document = await loadViewableDocument(id, auth);
    if (!document) {
      return documentNotFoundResponse();
    }

    if (!isDocumentEditableStatus(document.status)) {
      return NextResponse.json(
        { message: 'Ro‘yxatga olingan hujjatni yo‘naltirib bo‘lmaydi' },
        { status: 400 }
      );
    }

    const commander = await findUserById(currentUserId);
    if (!commander?.personal || !commander.job) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    if (!commander.personal.province || !commander.job.organ) {
      return NextResponse.json(
        { message: 'Komandir viloyat yoki masul organi aniqlanmadi' },
        { status: 400 }
      );
    }

    const targetUsers = await findUsersByIds(userIds);
    const targetById = new Map(targetUsers.map((u) => [u.id, u]));

    const queue = [];
    for (let i = 0; i < userIds.length; i++) {
      const uid = userIds[i];
      if (!isValidDbId(uid)) continue;

      const targetUser = targetById.get(uid);
      if (!targetUser?.personal || !targetUser.job) continue;

      if (
        !isSameUnitAsCommander(
          commander.personal,
          commander.job,
          targetUser.personal,
          targetUser.job
        )
      ) {
        return NextResponse.json(
          {
            message:
              'Faqat komandir bilan bir viloyat va bir xil organ (joy)dagi foydalanuvchilarni tanlash mumkin',
          },
          { status: 403 }
        );
      }

      queue.push({
        userId: uid,
        fullName: buildPersonalFullName(targetUser.personal),
        militaryRank: targetUser.job.militaryRank ?? '',
        position: targetUser.job.position ?? '',
        order: i + 1,
        hasSigned: false,
      });
    }

    if (queue.length === 0) {
      return NextResponse.json(
        { message: 'Tanlangan foydalanuvchilar topilmadi' },
        { status: 400 }
      );
    }

    const allowedSet = new Set<string>(
      (document.allowedUsers ?? []).map((u) => u.userId)
    );
    allowedSet.add(currentUserId);
    allowedSet.add(document.ownerId);
    queue.forEach((q) => allowedSet.add(String(q.userId)));

    const patch: Parameters<typeof updateDocument>[1] = {
      forwardedTo: queue,
      currentViewIndex: 0,
      status: DocumentStatus.IN_PROGRESS_FORWARD,
      allowedUserIds: Array.from(allowedSet),
    };

    // Boshliq ko'rib chiqayotgan hujjat: rezolyutsiya = boshliq imzosi (E-IMZO bilan).
    // Hujjat darhol tasdiqlanadi, keyin ijrochilarga navbat bilan boradi.
    const docView = serializeDocumentForApi(document) as unknown as DocumentType;
    const signingNow = isAwaitingCommanderApproval(docView);
    let eimzoSignature: VerifiedDocumentSignature | null = null;
    if (signingNow) {
      if (await isEimzoRequired(currentUserId)) {
        try {
          eimzoSignature = await verifyDocumentSignRequest(request, currentUserId, id, body?.eimzo);
        } catch (e) {
          if (e instanceof DocumentSignError) {
            return NextResponse.json({ message: e.message, code: e.code }, { status: e.status });
          }
          throw e;
        }
      }
      const signDoc = {
        sentToCommander: document.sentToCommander,
        status: document.status,
        forwardedById: null,
        forwardedTo: [],
        bosSigned: document.bosSigned,
        forwardedSigner: document.forwardedSigner,
      };
      const signed = await applyCommanderDocumentSign(
        signDoc as Parameters<typeof applyCommanderDocumentSign>[0],
        currentUserId,
        (await getSignerMeta(currentUserId)).organization
      );
      if (!signed.ok) {
        return NextResponse.json({ message: signed.message }, { status: signed.status });
      }
      patch.bosSigned = signDoc.bosSigned;
      patch.status = DocumentStatus.APPROVED;
    }

    await applyCommanderCommentSignature(patch, currentUserId, comment);
    await updateDocument(id, patch);
    if (eimzoSignature) await saveDocumentSignature(id, currentUserId, eimzoSignature);
    if (signingNow) {
      await logDocumentEvent({ documentId: id, actorId: currentUserId, type: 'commander_signed' });
    }
    await logDocumentEvent({
      documentId: id,
      actorId: currentUserId,
      type: 'resolution',
      note: [comment, `Ijrochilar: ${queue.map((q) => q.fullName).join(', ')}`].filter(Boolean).join('; '),
    });

    const savedView = serializeDocumentForApi(
      (await findDocumentById(id))!
    );

    return NextResponse.json(
      {
        message: signingNow ?
          'Hujjat imzolandi va rezolyutsiya bo‘yicha navbat bilan yuborildi'
        : 'Hujjat navbat bilan yuborildi',
        forwardedTo: queue,
        forwardedComment: savedView.forwardedComment,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Hujjatni yo‘naltirishda xato:', error);
    return NextResponse.json({ message: 'Serverda xatolik' }, { status: 500 });
  }
}
