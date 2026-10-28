import { canCommanderReviewEdit } from '@/lib/documentLifecycle';
import type { WorkflowDocument } from '@/lib/documentWorkflow';
import { resolveIdReference } from '@/lib/resolveIdReference';
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
  doc: {
    owner?: unknown;
    author?: { userId?: unknown; user?: { userId?: unknown } } | null;
  },
  userId: string | null | undefined
): boolean {
  if (!userId) return false;
  const uid = userId.toString();
  const ownerId = resolveIdReference(doc.owner);
  if (ownerId && ownerId === uid) return true;
  const authorId = resolveIdReference(
    doc.author?.userId ?? doc.author?.user?.userId
  );
  if (authorId && authorId === uid) return true;
  return false;
}

/** Tahrirlash: egasi (ro‘yxatgacha) yoki komandir ko‘rib chiqish bosqichida */
export function canUserEditDocument(
  doc: {
    owner?: unknown;
    author?: { userId?: unknown; user?: { userId?: unknown } } | null;
    status?: string;
    sentToCommander?: boolean;
    forwardedBy?: unknown;
  },
  userId: string | null | undefined
): boolean {
  if (canUserEditOwnDocument(doc, userId)) return true;
  return canCommanderReviewEdit(doc as unknown as WorkflowDocument, userId);
}

/** Hujjat egasi ro‘yxatga olinguncha tahrirlashi mumkin */
export function canUserEditOwnDocument(
  doc: {
    owner?: unknown;
    author?: { userId?: unknown; user?: { userId?: unknown } } | null;
    status?: string;
  },
  userId: string | null | undefined
): boolean {
  if (!isDocumentCreator(doc, userId)) return false;
  return isDocumentEditableStatus(doc.status);
}
