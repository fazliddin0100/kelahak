'use client';

import {
  canForwardReviewerSign,
  findQueueEntryForUser,
} from '@/lib/forwardQueue';
import { canUserEditOwnDocument } from '@/lib/documentEditRules';
import {
  canCommanderReviewEdit,
  canOwnerLinkToNomeklatura,
  canOwnerSubmitToKotibiyat,
  isDocumentInWorkFile,
} from '@/lib/documentLifecycle';
import {
  isAwaitingCommanderApproval,
  isDocumentLinkedToNomeklatura,
  isUserAuthorSigned,
} from '@/lib/documentWorkflow';
import { isCommanderApproved } from '@/lib/documentLifecycle';
import { DocumentActionRoleGroup } from '@/lib/documentActionRole';
import { resolveMongoId } from '@/lib/resolveMongoId';
import { DocumentType } from '@/types/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { useMemo } from 'react';
import { DRAFT_STATUSES, NON_EDITABLE_STATUSES } from './constants';
import type { DocumentActionPermissions } from './types';
import type { UseDocumentActionsOptions } from './types';

export function useDocumentActionPermissions({
  document,
  roleGroup,
  currentUserId,
  staffProvince,
}: UseDocumentActionsOptions): DocumentActionPermissions {
  return useMemo(() => {
    const status = document.status as DocumentStatus;
    const terminal = NON_EDITABLE_STATUSES.includes(status);
    const inWorkFile = isDocumentInWorkFile(document);
    const linked =
      isDocumentLinkedToNomeklatura(document) || inWorkFile;

    const forwarderId = resolveMongoId(document.forwardedBy);
    const isForwarder =
      !!currentUserId && !!forwarderId && forwarderId === currentUserId;
    const commanderBosSigned =
      document.bosSigned?.hasSigned === true &&
      resolveMongoId(
        (document.bosSigned as { userId?: unknown; user?: { userId?: unknown } })
          ?.userId ?? document.bosSigned?.user?.userId
      ) === currentUserId;

    const forwardQueueEntry =
      currentUserId ?
        findQueueEntryForUser(document, currentUserId)
      : undefined;

    const canForwardReviewSign =
      !!currentUserId &&
      !!forwardQueueEntry &&
      !forwardQueueEntry.hasSigned &&
      canForwardReviewerSign(document, currentUserId);

    if (inWorkFile) {
      return {
        canEdit: false,
        canSign: false,
        canSignLabel: 'Imzolash',
        canRegister: false,
        canBack: false,
        canSend: true,
        sendLabel: 'Ko‘rish uchun yuborish',
        canLinkNomeklatura: false,
        nomeklaturaLabel: 'Ish jildda',
        forwardReviewOnly: false,
        workFileShareOnly: true,
      };
    }

    if (canForwardReviewSign) {
      return {
        canEdit: false,
        canSign: true,
        canSignLabel: 'Ijroga tasdiqlash',
        canRegister: false,
        canBack: false,
        canSend: true,
        sendLabel: 'Ko‘rish uchun yuborish',
        canLinkNomeklatura: false,
        nomeklaturaLabel: 'Ish jildga tikish',
        forwardReviewOnly: true,
        workFileShareOnly: false,
      };
    }

    const canEditOwn = canUserEditOwnDocument(document, currentUserId);
    const ownerId = resolveMongoId(document.owner);
    const isOwner = !!currentUserId && ownerId === currentUserId;
    const canSubmitKotibiyat =
      isOwner && canOwnerSubmitToKotibiyat(document);
    const canLinkWorkFile =
      isOwner && canOwnerLinkToNomeklatura(document);

    if (roleGroup === 'kotibiyat') {
      return {
        canEdit: canEditOwn,
        canSign: !terminal,
        canSignLabel: 'Imzolash',
        canRegister:
          status !== DocumentStatus.REGISTERED &&
          status !== DocumentStatus.ACCEPTED,
        canBack: !terminal,
        canSend: true,
        sendLabel: 'Ko‘rish uchun yuborish',
        canLinkNomeklatura: !linked,
        nomeklaturaLabel:
          linked ? 'Ish jildga biriktirilgan' : 'Ish jildga tikish',
        forwardReviewOnly: false,
        workFileShareOnly: false,
      };
    }

    const draftEdit = DRAFT_STATUSES.includes(status);

    /** Komandir `document-open` da imzolash doim ko‘rinadi (API holatni tekshiradi) */
    const commanderSign =
      roleGroup === 'commander' &&
      !commanderBosSigned &&
      !isCommanderApproved(document) &&
      !terminal;

    const defaultSign =
      isOwner &&
      !isUserAuthorSigned(document) &&
      !isAwaitingCommanderApproval(document) &&
      (draftEdit ||
        status === DocumentStatus.CREATED ||
        status === DocumentStatus.YANGI);

    const commanderCanEdit =
      roleGroup === 'commander' &&
      canCommanderReviewEdit(document, currentUserId);

    return {
      canEdit: canEditOwn || commanderCanEdit,
      canSign: commanderSign || defaultSign,
      canSignLabel: roleGroup === 'commander' ? 'Imzolash (tasdiq)' : 'Imzolash',
      canRegister: false,
      canBack: roleGroup === 'commander' && !terminal && !commanderBosSigned,
      canSend: canSubmitKotibiyat,
      sendLabel: 'Kotibiyatga yuborish',
      canLinkNomeklatura: canLinkWorkFile,
      nomeklaturaLabel:
        inWorkFile || linked ?
          'Ish jildda'
        : 'Ish jildga yuborish',
      forwardReviewOnly: false,
      workFileShareOnly: false,
    };
  }, [document, roleGroup, currentUserId, staffProvince]);
}
