import { DocumentType } from '@/types/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { resolveMongoId } from '@/lib/resolveMongoId';

export type ForwardQueueEntry = {
  userId: string;
  fullName: string;
  militaryRank: string;
  position: string;
  order: number;
  hasSigned: boolean;
  signedAt?: Date;
};

const FORWARD_REVIEW_STATUSES: DocumentStatus[] = [
  DocumentStatus.IN_PROGRESS_FORWARD,
  DocumentStatus.IN_PROGRESS_FORWARD_REVIEW,
  DocumentStatus.SIGNED,
  DocumentStatus.FORWARDED,
];

export function buildPersonalFullName(personal: {
  fName?: string;
  name?: string;
  sName?: string;
}): string {
  return [personal.name, personal.fName, personal.sName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function normalizeForwardQueue(document: DocumentType): ForwardQueueEntry[] {
  if (!Array.isArray(document.forwardedTo)) return [];

  return document.forwardedTo
    .filter((item) => typeof item === 'object' && item !== null)
    .map((item, idx) => {
      const row = item as {
        userId?: unknown;
        fullName?: string;
        militaryRank?: string;
        position?: string;
        order?: number;
        hasSigned?: boolean;
        signedAt?: Date | string;
      };
      const uid = resolveMongoId(row.userId);
      return {
        userId: uid ?? '',
        fullName: row.fullName?.trim() || '',
        militaryRank: row.militaryRank?.trim() || '',
        position: row.position?.trim() || '',
        order: typeof row.order === 'number' ? row.order : idx + 1,
        hasSigned: !!row.hasSigned,
        signedAt:
          row.signedAt ?
            row.signedAt instanceof Date ?
              row.signedAt
            : new Date(row.signedAt)
          : undefined,
      };
    })
    .filter((e) => e.userId)
    .sort((a, b) => a.order - b.order);
}

export function hasPendingForwardSignatures(document: DocumentType): boolean {
  return normalizeForwardQueue(document).some((q) => !q.hasSigned);
}

export function findQueueEntryForUser(
  document: DocumentType,
  userId: string
): ForwardQueueEntry | undefined {
  const normalizedUserId = userId.trim();
  return normalizeForwardQueue(document).find((e) => e.userId === normalizedUserId);
}

export function getFirstUnsignedQueueEntry(
  document: DocumentType
): ForwardQueueEntry | undefined {
  return normalizeForwardQueue(document).find((q) => !q.hasSigned);
}

/** Navbatda hozir tasdiqlashi kerak bo‘lgan foydalanuvchi (birinchi imzosiz) */
export function isUserActiveForwardReviewer(
  document: DocumentType,
  userId: string
): boolean {
  if (!hasPendingForwardSignatures(document)) return false;

  const status = document.status as DocumentStatus;
  if (!FORWARD_REVIEW_STATUSES.includes(status)) return false;

  const entry = findQueueEntryForUser(document, userId);
  if (!entry || entry.hasSigned) return false;

  const firstUnsigned = getFirstUnsignedQueueEntry(document);
  return firstUnsigned?.userId === userId.trim();
}

export function canForwardReviewerSign(
  document: DocumentType,
  userId: string
): boolean {
  return isUserActiveForwardReviewer(document, userId);
}

export function advanceForwardQueueAfterSign(document: {
  forwardedTo?: DocumentType['forwardedTo'];
  currentViewIndex?: number;
}): void {
  const queue = normalizeForwardQueue(document as DocumentType);
  const nextIdx = queue.findIndex((q) => !q.hasSigned);
  document.currentViewIndex = nextIdx === -1 ? queue.length : nextIdx;
}

type ForwardCompletionDoc = {
  status?: string;
  forwardedTo?: DocumentType['forwardedTo'];
  bosSigned?: DocumentType['bosSigned'];
  forwardedSigner?: DocumentType['forwardedSigner'];
};

const FORWARD_ACTIVE_STATUSES: DocumentStatus[] = [
  DocumentStatus.IN_PROGRESS_FORWARD,
  DocumentStatus.IN_PROGRESS_FORWARD_REVIEW,
];

/** Navbatdagi oxirgi foydalanuvchi imzolagach — ro‘yxatga olishga tayyor (`imzolandi`) */
export function completeForwardWorkflowIfReady(
  document: ForwardCompletionDoc
): boolean {
  const doc = document as DocumentType;
  if (!Array.isArray(doc.forwardedTo) || doc.forwardedTo.length === 0) {
    return false;
  }
  if (!FORWARD_ACTIVE_STATUSES.includes(doc.status as DocumentStatus)) {
    return false;
  }
  if (hasPendingForwardSignatures(doc)) {
    return false;
  }

  document.status = DocumentStatus.APPROVED;

  const fs = document.forwardedSigner;
  if (
    fs &&
    typeof fs === 'object' &&
    fs.hasSigned &&
    !document.bosSigned?.hasSigned
  ) {
    document.bosSigned = {
      userId: fs.userId ?? '',
      fullName: fs.fullName ?? '',
      militaryRank: fs.militaryRank ?? '',
      position: fs.position ?? '',
      hasSigned: true,
      signedAt: fs.signedAt ?? new Date(),
    } as unknown as DocumentType['bosSigned'];
  }

  return true;
}
