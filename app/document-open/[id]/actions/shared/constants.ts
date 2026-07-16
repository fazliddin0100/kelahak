import { DOCUMENT_LOCKED_STATUSES } from '@/lib/documentEditRules';
import { DocumentStatus } from '@/types/document-status.enum';

export const NON_EDITABLE_STATUSES = DOCUMENT_LOCKED_STATUSES;

export const DRAFT_STATUSES: DocumentStatus[] = [
  DocumentStatus.YANGI,
  DocumentStatus.CREATED,
];
