// app/api/documents/[id]/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/prisma';
import { parseAttachmentTextIds } from '@/lib/parseAttachmentTextIds';
import {
  canCommanderReviewEdit,
} from '@/lib/documentLifecycle';
import {
  canViewDocument,
  canViewDocumentDirect,
  documentNotFoundResponse,
  filterAttachableDocumentIds,
  isCommanderActor,
  loadViewableDocument,
} from '@/lib/documentAccess';
import {
  canUserEditOwnDocument,
  isDocumentCreator,
} from '@/lib/documentEditRules';
import {
  resolveReceiverList,
  resolveSigner,
  resolveSignerList,
} from '@/lib/documentSigners';
import type { WorkflowDocument } from '@/lib/documentWorkflow';
import { sanitizeDocumentContent } from '@/lib/purify';
import {
  findDocumentById,
  findDocuments,
  isValidDbId,
  serializeDocumentForApi,
  updateDocument,
} from '@/lib/db/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { NextRequest, NextResponse } from 'next/server';

const MAX_TITLE_LENGTH = 500;
const MAX_GRIF_LENGTH = 100;
const MAX_COPY_TARGETS = 30;

function cleanCopyNumber(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, MAX_COPY_TARGETS);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!id || !isValidDbId(id)) {
      return NextResponse.json({ message: "Noto'g'ri ID" }, { status: 400 });
    }
    const auth = await requireApiAuth(request, { permission: 'edit_document' });
    if (isAuthError(auth)) return auth;
    const { userId, role } = auth;

    const document = await findDocumentById(id, {
      includeOwner: true,
      includeAttachments: true,
      includeAllowedUsers: true,
      includeContent: true,
    });

    if (!document || !(await canViewDocument(document, auth))) {
      return documentNotFoundResponse();
    }

    const docForRules = serializeDocumentForApi(document, { populateOwner: true });

    const commanderApproved =
      document.status === DocumentStatus.APPROVED ||
      (document.bosSigned as { hasSigned?: boolean } | null)?.hasSigned === true;

    const canEditAsOwner =
      canUserEditOwnDocument(docForRules, userId) && !commanderApproved;
    const canEditAsCommander =
      isCommanderActor(auth) &&
      canViewDocumentDirect(document, auth) &&
      canCommanderReviewEdit(docForRules as unknown as WorkflowDocument, userId);

    if (!canEditAsOwner && !canEditAsCommander) {
      if (!isDocumentCreator(docForRules, userId)) {
        return NextResponse.json(
          { message: 'Faqat hujjat egasi tahrirlashi mumkin' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        {
          message:
            commanderApproved ?
              'Komandir tasdiqlagan hujjatni tahrirlab bo‘lmaydi'
            : "Hujjat ro'yxatga olingan -- tahrirlash mumkin emas",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === 'string' ? body.title.trim() : '';
    const grif = typeof body.grif === 'string' ? body.grif.trim() : '';
    if (title.length > MAX_TITLE_LENGTH || grif.length > MAX_GRIF_LENGTH) {
      return NextResponse.json(
        { message: 'Sarlavha yoki grif juda uzun' },
        { status: 400 }
      );
    }

    const updatePayload: Parameters<typeof updateDocument>[1] = {
      grif,
      copyNumber: cleanCopyNumber(body.copyNumber),
      title: title || document.title || undefined,
    };

    if (body.content !== undefined) {
      updatePayload.content = sanitizeDocumentContent(body.content) || {};
    }

    if (body.attachmentText !== undefined) {
      updatePayload.attachmentIds = await filterAttachableDocumentIds(
        parseAttachmentTextIds(body.attachmentText),
        auth,
        (document.attachments ?? []).map((a) => a.attachmentId)
      );
    }

    // Imzolovchilar: mijozdan faqat userId olinadi, imzo holati hech qachon.
    const [bosSigned, approvers, sender, receiver, author] = await Promise.all([
      resolveSigner(body.signerInfo),
      Array.isArray(body.signerInfo?.approvers) ?
        resolveSignerList(body.signerInfo.approvers)
      : null,
      resolveSigner(body.sender),
      Array.isArray(body.receiver) ? resolveReceiverList(body.receiver) : null,
      resolveSigner(body.author),
    ]);

    if (bosSigned) updatePayload.bosSigned = bosSigned;
    if (approvers) updatePayload.approvers = approvers;
    if (sender) updatePayload.sender = sender;
    if (receiver) updatePayload.receiver = receiver;
    if (author) updatePayload.author = author;

    const updated = await updateDocument(id, updatePayload);

    return NextResponse.json(
      {
        message: "Hujjat o'zgartirildi",
        user: role,
        attachmentText: (updated.attachments ?? []).map((a) => a.attachmentId),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Xato:', error);
    return NextResponse.json({ message: 'Xatolik' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!id || !isValidDbId(id)) {
      return NextResponse.json({ message: "Noto'g'ri ID" }, { status: 400 });
    }

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;

    const document = await loadViewableDocument(id, auth, {
      includeContent: true,
      includeAttachments: true,
      includeOwner: true,
      includeForwardedBy: true,
    });

    if (!document) {
      return documentNotFoundResponse();
    }

    const attachmentIds = parseAttachmentTextIds(
      (document.attachments ?? []).map((a) => a.attachmentId)
    );

    if (attachmentIds.length > 0) {
      const attachmentDocs = await findDocuments({ id: { in: attachmentIds } });
      const byId = new Map(attachmentDocs.map((d) => [d.id, d]));
      document.attachments = attachmentIds.map((attachmentId) => ({
        documentId: id,
        attachmentId,
        attachment: byId.get(attachmentId),
      }));
    }

    const populatedDoc = serializeDocumentForApi(document, {
      includeContent: true,
      populateOwner: true,
      populateAuthorUser: true,
      populateSenderUser: true,
      populateReceiverUsers: true,
      populateBosSignedUser: true,
      populateApproversUsers: true,
      populateAttachments: true,
      populateForwardedBy: true,
    });

    // Eski yozuvlar ham brauzerga faqat tozalangan HTML bo‘lib boradi.
    populatedDoc.content = sanitizeDocumentContent(populatedDoc.content) || {};

    const { ensureSenderFromAuthor } = await import('@/lib/ensureDocumentParties');

    return NextResponse.json(ensureSenderFromAuthor(populatedDoc), {
      status: 200,
    });
  } catch (error: unknown) {
    console.error('Hujjatni olishda xato:', error);
    return NextResponse.json(
      { message: 'Hujjatni olishda xatolik' },
      { status: 500 }
    );
  }
}
