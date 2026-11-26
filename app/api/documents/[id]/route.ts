// app/api/documents/[id]/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
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
import { syncTemplateFromDocument } from '@/lib/userTemplates';
import {
  findDocumentById,
  findDocuments,
  isValidDbId,
  serializeDocumentForApi,
  updateDocument,
} from '@/lib/db/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { NextRequest, NextResponse } from 'next/server';
import {
  isBlankDocumentType,
  isCustomTypeDocument,
  normalizeDocumentType,
  validateCustomDocumentType,
} from '@/lib/resolveDocumentTemplateKey';

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

    // Hujjat turi: shablonli hujjatda o'zgarmaydi; "Yangi hujjat" da user yozadi
    let nextTitle = document.title || undefined;
    if (isCustomTypeDocument(document.title)) {
      if (title && !isBlankDocumentType(title)) {
        const typeError = validateCustomDocumentType(title);
        if (typeError) {
          return NextResponse.json({ message: typeError }, { status: 400 });
        }
        // «Bildirgi» kabi tayyor shablon nomi — hujjat shu shablonga aylanadi (keyin tur o'zgarmaydi)
        nextTitle = normalizeDocumentType(title);
      }
    }

    const updatePayload: Parameters<typeof updateDocument>[1] = {
      grif,
      copyNumber: cleanCopyNumber(body.copyNumber),
      title: nextTitle,
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

    // Qayta saqlashda imzolar yo'qolmasin: o'sha xodim avval imzolagan bo'lsa, belgisi saqlanadi
    type SignerLike = Record<string, unknown> & { userId?: unknown; hasSigned?: boolean; signedAt?: unknown };
    const keepSigned = <T,>(next: T, prev: unknown): T => {
      const n = next as unknown as SignerLike;
      const p = prev as SignerLike | null | undefined;
      if (!n || !p || typeof p !== 'object') return next;
      if (String(n.userId ?? '') && String(n.userId) === String(p.userId ?? '') && p.hasSigned) {
        return { ...n, hasSigned: true, signedAt: p.signedAt ?? n.signedAt } as unknown as T;
      }
      return next;
    };
    const prevApprovers = (Array.isArray(document.approvers) ? document.approvers : []) as SignerLike[];

    if (bosSigned) updatePayload.bosSigned = bosSigned;
    if (approvers) {
      updatePayload.approvers = approvers.map((a) =>
        keepSigned(a, prevApprovers.find((p) => String(p?.userId ?? '') === String((a as SignerLike).userId ?? '')))
      );
    }
    if (sender) updatePayload.sender = keepSigned(sender, document.sender);
    if (receiver) updatePayload.receiver = receiver;
    if (author) updatePayload.author = keepSigned(author, document.author);

    const updated = await updateDocument(id, updatePayload);

    // "Yangi hujjat" turi va shakli egasining shaxsiy namunalariga qo'shiladi
    if (document.ownerId === userId && isCustomTypeDocument(nextTitle)) {
      try {
        await syncTemplateFromDocument({
          ownerId: userId,
          documentId: id,
          title: nextTitle,
          content:
            typeof updatePayload.content === 'string' ?
              updatePayload.content
            : undefined,
        });
      } catch (err) {
        console.error('Hujjat namunasini saqlashda xato:', err);
      }
    }

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

/**
 * Adashib yaratilgan qoralamani o'chirish: faqat egasi va faqat hech kim imzolamagan
 * («yangi»/«created», muallif imzosi yo'q, E-IMZO imzolari yo'q) hujjat.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { id } = await params;
    if (!isValidDbId(id)) return documentNotFoundResponse();

    const document = await findDocumentById(id);
    if (!document || document.ownerId !== auth.userId) return documentNotFoundResponse();

    const author = (document.author ?? {}) as { hasSigned?: boolean };
    const draft =
      (document.status === DocumentStatus.YANGI || document.status === DocumentStatus.CREATED) &&
      !author.hasSigned &&
      document.registrationIndex == null &&
      !document.isCopy;
    const signatures = await prisma.documentSignature.count({ where: { documentId: id } });
    if (!draft || signatures > 0) {
      return NextResponse.json(
        { message: 'Faqat hali imzolanmagan qoralamani o‘chirish mumkin' },
        { status: 400 }
      );
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ message: 'Hujjat o‘chirildi' });
  } catch (error) {
    console.error('Hujjatni o‘chirishda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
