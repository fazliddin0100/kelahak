import { buildForwardedSignerFromUserId } from '@/lib/documentForwardedSigner';
import {
  isCommanderReviewStatus,
  isForwardQueueComplete,
} from '@/lib/documentWorkflow';
import { resolveIdReference } from '@/lib/resolveIdReference';
import { DocumentType } from '@/types/document';
import { DocumentStatus } from '@/types/document-status.enum';

export type DocumentDoc = {
  sharedWithAdmin?: boolean;
  sentToCommander?: boolean;
  forwardedById?: string | null;
  status?: string;
  forwardedTo?: DocumentType['forwardedTo'];
  bosSigned?: {
    hasSigned?: boolean;
    userId?: unknown;
    fullName?: string;
    militaryRank?: string;
    position?: string;
    signedAt?: Date;
  } | null;
  forwardedSigner?: unknown;
};

/** Komandir yakuniy imzosi — holat `imzolandi` (APPROVED) */
export async function applyCommanderDocumentSign(
  document: DocumentDoc,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const forwarderId = resolveIdReference(document.forwardedById);
  const isForwarder = forwarderId === userId;
  const directReview =
    document.sentToCommander === true &&
    isCommanderReviewStatus(document.status);

  if (!isForwarder && !directReview) {
    return {
      ok: false,
      message: 'Bu hujjatni komandir sifatida imzolash mumkin emas',
      status: 403,
    };
  }

  if (isForwarder && document.status !== DocumentStatus.IN_PROGRESS_FORWARD) {
    return {
      ok: false,
      message: 'Hujjat holati imzolash uchun mos emas',
      status: 400,
    };
  }

  if (
    directReview &&
    !isForwarder &&
    !isForwardQueueComplete(document as DocumentType)
  ) {
    return {
      ok: false,
      message:
        'Komandir yo‘naltirgan barcha xodimlar tasdiqlaguncha imzolab bo‘lmaydi',
      status: 400,
    };
  }

  const bosUserId = resolveIdReference(document.bosSigned?.userId);
  if (document.bosSigned?.hasSigned && bosUserId === userId) {
    return {
      ok: false,
      message: 'Siz allaqachon ushbu hujjatni imzolagansiz',
      status: 400,
    };
  }

  const signer = await buildForwardedSignerFromUserId(userId);
  if (!signer) {
    return {
      ok: false,
      message: 'Komandir ma’lumotlari topilmadi',
      status: 400,
    };
  }

  document.bosSigned = {
    userId: signer.userId,
    fullName: signer.fullName,
    militaryRank: signer.militaryRank,
    position: signer.position,
    hasSigned: true,
    signedAt: signer.signedAt,
  };
  document.forwardedSigner = signer;
  document.status = DocumentStatus.APPROVED;
  if (!document.forwardedById && signer.userId) {
    document.forwardedById = signer.userId;
  }

  return { ok: true };
}
