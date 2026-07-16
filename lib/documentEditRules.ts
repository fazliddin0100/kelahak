import { canCommanderReviewEdit } from '@/lib/documentLifecycle';
import { resolveMongoId } from '@/lib/resolveMongoId';
import { DocumentStatus } from '@/types/document-status.enum';

/** Ro‘yxatga olingandan keyin tahrirlash bloklanadi */
export const DOCUMENT_LOCKED_STATUSES: DocumentStatus[] = [
  DocumentStatus.REGISTERED,
  DocumentStatus.ACCEPTED,
  DocumentStatus.IN_WORK_FILE,
  DocumentStatus.ARCHIVED,
  DocumentStatus.DELETED,
];

export function isDocumentEditableStatus(status?: string): boolean {
  if (!status) return true;
  return !DOCUMENT_LOCKED_STATUSES.includes(status as DocumentStatus);
}

export function isDocumentCreator(
  doc: { owner?: unknown; author?: { userId?: unknown } | null },
  userId: string | null | undefined
): boolean {
  if (!userId) return false;
  const uid = userId.toString();
  const ownerId = resolveMongoId(doc.owner);
  if (ownerId && ownerId === uid) return true;
  const authorId = resolveMongoId(doc.author?.userId);
  if (authorId && authorId === uid) return true;
  return false;
}

/** Tahrirlash: egasi (ro‘yxatgacha) yoki komandir ko‘rib chiqish bosqichida */
export function canUserEditDocument(
  doc: {
    owner?: unknown;
    author?: { userId?: unknown } | null;
    status?: string;
    sentToCommander?: boolean;
    forwardedBy?: unknown;
  },
  userId: string | null | undefined
): boolean {
  if (canUserEditOwnDocument(doc, userId)) return true;
  return canCommanderReviewEdit(doc, userId);
}

/** Hujjat egasi ro‘yxatga olinguncha tahrirlashi mumkin */
export function canUserEditOwnDocument(
  doc: {
    owner?: unknown;
    author?: { userId?: unknown } | null;
    status?: string;
  },
  userId: string | null | undefined
): boolean {
  if (!isDocumentCreator(doc, userId)) return false;
  return isDocumentEditableStatus(doc.status);
}
