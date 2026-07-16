import { isUserAuthorSigned, type WorkflowDocument } from '@/lib/documentWorkflow';

type SignField = { hasSigned?: boolean } | null | undefined;

function countSigned(field: SignField | SignField[]): number {
  if (!field) return 0;
  if (Array.isArray(field)) {
    return field.filter((x) => x?.hasSigned === true).length;
  }
  return field.hasSigned ? 1 : 0;
}

function countFields(field: SignField | SignField[]): number {
  if (!field) return 0;
  if (Array.isArray(field)) return field.length;
  return 1;
}

/** Komandir (bosSigned) alohida — hujjat «signed» statusiga ta’sir qilmaydi */
/** Komandir navbati (forwardedTo) alohida tasdiqlanadi */
export type ParticipantSignDocument = {
  author?: SignField;
  sender?: SignField;
  approvers?: SignField[] | null;
  receiver?: SignField[] | null;
};

export function countParticipantSigned(doc: ParticipantSignDocument): number {
  return (
    countSigned(doc.author) +
    countSigned(doc.sender) +
    countSigned(doc.approvers ?? []) +
    countSigned(doc.receiver ?? [])
  );
}

export function countParticipantFields(doc: ParticipantSignDocument): number {
  return (
    countFields(doc.author) +
    countFields(doc.sender) +
    countFields(doc.approvers ?? []) +
    countFields(doc.receiver ?? [])
  );
}

/**
 * Ishtirokchilar imzosi yakunlanganini tekshiradi.
 * User→komandir oqimida holat `in_progress`; komandir keyin `imzolandi` (APPROVED).
 */
export function canMarkDocumentFullySigned(
  doc: ParticipantSignDocument & WorkflowDocument,
  mode: 'strict' | 'loose' = 'strict',
  options?: { isForwardReviewerSign?: boolean }
): boolean {
  if (options?.isForwardReviewerSign) return false;

  const total = countParticipantFields(doc);
  const signed = countParticipantSigned(doc);

  if (total === 0) {
    return isUserAuthorSigned(doc);
  }

  if (mode === 'strict') {
    return signed === total && signed > 0;
  }

  return signed >= 1 && isUserAuthorSigned(doc);
}
