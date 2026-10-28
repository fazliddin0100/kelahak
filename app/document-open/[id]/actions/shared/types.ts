import { DocumentType } from '@/types/document';
import { DocumentActionRoleGroup } from '@/lib/documentActionRole';

export interface DocumentActionsProps {
  document: DocumentType;
  onRefresh?: () => void | Promise<void>;
  viewFrom?: string | null;
}

export interface DocumentActionPermissions {
  canEdit: boolean;
  canSign: boolean;
  signCompleted: boolean;
  canSignLabel: string;
  canRegister: boolean;
  canBack: boolean;
  canSend: boolean;
  sendLabel: string;
  canLinkNomeklatura: boolean;
  nomeklaturaLabel: string;
  forwardReviewOnly: boolean;
  /** `ishjildda` — faqat ko‘rish uchun yuborish */
  workFileShareOnly: boolean;
}

export interface DocumentActionHandlers {
  onEdit: () => void;
  onSign: () => void;
  onRegister: () => void;
  onBack: () => void;
  onSend: () => void;
  onLinkNomeklatura: () => void;
}

export type UseDocumentActionsOptions = {
  document: DocumentType;
  roleGroup: DocumentActionRoleGroup | null;
  currentUserId: string | null;
  staffProvince?: string;
};
