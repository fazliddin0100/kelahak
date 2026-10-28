import { hasPendingForwardSignatures } from '@/lib/forwardQueue';
import { resolveIdReference } from '@/lib/resolveIdReference';
import {
  canUserSubmitToKotibiyat,
  isCommanderSigned,
  isDocumentLinkedToNomeklatura,
  isUserAuthorSigned,
  type WorkflowDocument,
} from '@/lib/documentWorkflow';
import { DocumentStatus } from '@/types/document-status.enum';

/** Komandir tasdiqlagan (imzolandi) */
export function isCommanderApproved(doc: WorkflowDocument): boolean {
  return (
    doc.status === DocumentStatus.APPROVED ||
    isCommanderSigned(doc)
  );
}

/** Egasi kotibiyatga yuborishi mumkin */
export function canOwnerSubmitToKotibiyat(doc: WorkflowDocument): boolean {
  return canUserSubmitToKotibiyat(doc);
}

/** Hujjat ish jildda (nomeklaturaga biriktirilgan) */
export function isDocumentInWorkFile(doc: { status?: string }): boolean {
  return doc.status === DocumentStatus.IN_WORK_FILE;
}

/** Egasi ish jildga biriktirishi mumkin — qabul qilgandan keyin */
export function canOwnerLinkToNomeklatura(
  doc: WorkflowDocument & {
    nomenclatureId?: unknown;
    ownerAccepted?: boolean;
  }
): boolean {
  if (isDocumentLinkedToNomeklatura(doc)) return false;
  if (isDocumentInWorkFile(doc)) return false;
  if (
    doc.status === DocumentStatus.ARCHIVED ||
    doc.status === DocumentStatus.DELETED
  ) {
    return false;
  }
  return (
    doc.status === DocumentStatus.ACCEPTED || doc.ownerAccepted === true
  );
}

/** Komandir ko‘rib chiqayotgan hujjatni tahrirlashi (ro‘yxatgacha) */
export function canCommanderReviewEdit(
  doc: WorkflowDocument,
  commanderUserId: string | null | undefined
): boolean {
  if (!commanderUserId) return false;
  if (
    doc.status === DocumentStatus.REGISTERED ||
    doc.status === DocumentStatus.ACCEPTED ||
    doc.status === DocumentStatus.IN_WORK_FILE ||
    doc.status === DocumentStatus.ARCHIVED ||
    doc.status === DocumentStatus.DELETED
  ) {
    return false;
  }
  if (isCommanderApproved(doc)) return false;
  if (doc.sentToCommander !== true && !isUserAuthorSigned(doc)) return false;

  const forwarderId = resolveIdReference(
    (doc as WorkflowDocument & { forwardedBy?: unknown }).forwardedBy
  );
  if (forwarderId && forwarderId === commanderUserId) return true;
  if (doc.sentToCommander === true && isUserAuthorSigned(doc)) return true;

  return false;
}

export function hasPendingForwardWork(doc: WorkflowDocument): boolean {
  return hasPendingForwardSignatures(doc as Parameters<typeof hasPendingForwardSignatures>[0]);
}
