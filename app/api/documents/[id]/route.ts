// app/api/documents/[id]/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/mongodb';
import { parseAttachmentTextIds } from '@/lib/parseAttachmentTextIds';
import {
  canUserEditDocument,
  isDocumentCreator,
} from '@/lib/documentEditRules';
import { sanitizeHTML } from '@/lib/purify';
import {
  findDocumentById,
  findDocuments,
  isValidDbId,
  serializeDocumentForApi,
  updateDocument,
} from '@/lib/db/document';
import { NextRequest, NextResponse } from 'next/server';

type SignerInput = {
  userId?: unknown;
  fullName?: string;
  militaryRank?: string;
  position?: string;
  hasSigned?: boolean;
  signedAt?: Date;
};

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
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

    const document = await findDocumentById(id, {
      includeOwner: true,
      includeAttachments: true,
      includeAllowedUsers: true,
      includeContent: true,
    });

    if (!document) {
      return NextResponse.json(
        { message: 'Hujjat topilmadi' },
        { status: 404 }
      );
    }

    const docForRules = serializeDocumentForApi(document, { populateOwner: true });

    if (!canUserEditDocument(docForRules, userId)) {
      if (!isDocumentCreator(docForRules, userId)) {
        return NextResponse.json(
          { message: 'Faqat hujjat egasi tahrirlashi mumkin' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        {
          message: "Hujjat ro'yxatga olingan -- tahrirlash mumkin emas",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updatePayload: Parameters<typeof updateDocument>[1] = {
      grif: body.grif || '',
      copyNumber: Array.isArray(body.copyNumber) ? body.copyNumber : [],
      title: body.title || document.title || undefined,
      content:
        typeof body.content === 'string' ?
          sanitizeHTML(body.content)
        : body.content,
    };

    if (body.attachmentText !== undefined) {
      updatePayload.attachmentIds = parseAttachmentTextIds(body.attachmentText);
    }

    if (
      body.signerInfo?.userId &&
      isValidDbId(String(body.signerInfo.userId))
    ) {
      updatePayload.bosSigned = {
        userId: body.signerInfo.userId,
        fullName: body.signerInfo.fullName,
        militaryRank: body.signerInfo.militaryRank || '',
        position: body.signerInfo.position || '',
        hasSigned: body.signerInfo.hasSigned || false,
        signedAt: body.signerInfo.signedAt || undefined,
      };
    }

    if (Array.isArray(body.signerInfo?.approvers)) {
      updatePayload.approvers = (body.signerInfo.approvers as SignerInput[])
        .filter((a) => a.userId && isValidDbId(String(a.userId)))
        .map((a) => ({
          userId: a.userId,
          fullName: a.fullName,
          militaryRank: a.militaryRank || '',
          position: a.position || '',
          hasSigned: a.hasSigned || false,
          signedAt: a.signedAt || undefined,
        }));
    }

    if (body.sender?.userId && isValidDbId(String(body.sender.userId))) {
      updatePayload.sender = {
        userId: body.sender.userId,
        fullName: body.sender.fullName,
        militaryRank: body.sender.militaryRank || '',
        position: body.sender.position || '',
        hasSigned: body.sender.hasSigned || false,
      };
    }

    if (Array.isArray(body.receiver)) {
      updatePayload.receiver = (body.receiver as SignerInput[])
        .filter((r) => r.userId && isValidDbId(String(r.userId)))
        .map((r) => ({
          userId: r.userId,
          fullName: r.fullName,
          militaryRank: r.militaryRank || '',
          position: r.position || '',
        }));
    }

    if (body.author?.userId && isValidDbId(String(body.author.userId))) {
      updatePayload.author = {
        userId: body.author.userId,
        fullName: body.author.fullName,
        militaryRank: body.author.militaryRank || '',
        position: body.author.position || '',
        hasSigned: body.author.hasSigned || false,
      };
    }

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
    const message = error instanceof Error ? error.message : 'Nomaʼlum xato';
    console.error('Xato:', error);
    return NextResponse.json(
      { message: 'Xatolik', error: message },
      { status: 500 }
    );
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
    const { userId, role, user, department } = auth;


    const document = await findDocumentById(id, {
      includeContent: true,
      includeAttachments: true,
      includeOwner: true,
      includeForwardedBy: true,
    });

    if (!document) {
      return NextResponse.json(
        { message: 'Hujjat topilmadi' },
        { status: 404 }
      );
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

    const { ensureSenderFromAuthor } = await import('@/lib/ensureDocumentParties');

    return NextResponse.json(ensureSenderFromAuthor(populatedDoc), {
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Nomaʼlum xato';
    console.error('Hujjatni olishda xato:', error);
    return NextResponse.json(
      { message: 'Hujjatni olishda xatolik', error: message },
      { status: 500 }
    );
  }
}
