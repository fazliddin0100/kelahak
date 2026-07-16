import { hasPendingForwardSignatures } from '@/lib/forwardQueue';
import { resolveMongoId } from '@/lib/resolveMongoId';
import { DocumentType } from '@/types/document';
import { DocumentStatus } from '@/types/document-status.enum';

export type WorkflowDocument = {
  status?: string;
  ownerRegion?: string;
  author?: { hasSigned?: boolean };
  sender?: { hasSigned?: boolean };
  bosSigned?: { hasSigned?: boolean } | null;
  forwardedSigner?: { hasSigned?: boolean } | null;
  sentToCommander?: boolean;
  submittedToKotibiyat?: boolean;
  sharedWithAdmin?: boolean;
  createdByKotibiyat?: boolean;
  forwardedTo?: DocumentType['forwardedTo'];
};

const TERMINAL_STATUSES: DocumentStatus[] = [
  DocumentStatus.REGISTERED,
  DocumentStatus.ACCEPTED,
  DocumentStatus.DELETED,
  DocumentStatus.ARCHIVED,
];

/** Hujjat nomeklaturaga biriktirilgan */
export function isDocumentLinkedToNomeklatura(doc: {
  nomenclatureId?: unknown;
}): boolean {
  return !!resolveMongoId(doc.nomenclatureId);
}

/** User kotibiyatga yuborgan (oddiy user oqimi) */
export function isMarkedForKotibiyat(doc: WorkflowDocument): boolean {
  return doc.submittedToKotibiyat === true || doc.sharedWithAdmin === true;
}

export function isKotibiyatCreatedDocument(doc: WorkflowDocument): boolean {
  return doc.createdByKotibiyat === true;
}

/**
 * Kotibiyat oqimi — komandir imzosi shart emas.
 * Eski yozuvlar: sharedWithAdmin + sentToCommander false ham shu qatorga kiradi.
 */
export function isKotibiyatDirectFlow(doc: WorkflowDocument): boolean {
  if (doc.createdByKotibiyat === true) return true;
  return doc.sentToCommander === false && isMarkedForKotibiyat(doc);
}

export function normalizeRegion(region?: string): string {
  return region?.trim().toLowerCase() ?? '';
}

export function regionsMatch(a?: string, b?: string): boolean {
  const na = normalizeRegion(a);
  const nb = normalizeRegion(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function wasSentToCommander(doc: WorkflowDocument): boolean {
  if (doc.sentToCommander === true) return true;
  if (doc.sentToCommander === false) return false;
  return isUserAuthorSigned(doc);
}

export function isForwardQueueComplete(doc: WorkflowDocument): boolean {
  return !hasPendingForwardSignatures(doc as DocumentType);
}

export function isUserAuthorSigned(doc: WorkflowDocument): boolean {
  return doc.author?.hasSigned === true || doc.sender?.hasSigned === true;
}

/** Mahalliy komandir inbox — `commanderLocalInboxFilter` bilan bir xil */
export const COMMANDER_REVIEW_STATUSES: DocumentStatus[] = [
  DocumentStatus.YANGI,
  DocumentStatus.CREATED,
  DocumentStatus.IN_PROGRESS,
  DocumentStatus.IN_PROGRESS_FORWARD,
  DocumentStatus.SIGNED,
];

export function isCommanderReviewStatus(status?: string): boolean {
  return COMMANDER_REVIEW_STATUSES.includes(status as DocumentStatus);
}

/** Egasi imzolagan, komandir tasdiqlashi kutilmoqda */
export function isAwaitingCommanderApproval(doc: WorkflowDocument): boolean {
  if (!doc.sentToCommander || !isUserAuthorSigned(doc)) return false;
  if (isCommanderSigned(doc)) return false;
  return isCommanderReviewStatus(doc.status);
}

/** Faqat user → kotibiyat oqimida (yuborishdan oldin) talab qilinadi */
export function isCommanderSigned(doc: WorkflowDocument): boolean {
  if (isKotibiyatDirectFlow(doc)) return true;
  if (doc.status === DocumentStatus.APPROVED) return true;
  return (
    doc.bosSigned?.hasSigned === true || doc.forwardedSigner?.hasSigned === true
  );
}

function isTerminalStatus(status?: string): boolean {
  return TERMINAL_STATUSES.includes(status as DocumentStatus);
}

/**
 * Kotibiyat «Ro‘yxatga olish uchun kelgan» ro‘yxati:
 * - kotibiyat xodimi yaratgan → darhol (ro‘yxatga olinmaguncha)
 * - oddiy user → komandir + kotibiyatga yuborgan, imzolangan
 */
export function isKotibiyatQueueVisible(
  doc: WorkflowDocument,
  adminProvince: string,
): boolean {
  if (!regionsMatch(doc.ownerRegion, adminProvince)) return false;
  if (isTerminalStatus(doc.status)) return false;

  if (isKotibiyatDirectFlow(doc)) {
    if (!isMarkedForKotibiyat(doc)) return false;
    return doc.status === DocumentStatus.SIGNED || isUserAuthorSigned(doc);
  }

  if (!isSubmittedToKotibiyatQueue(doc)) return false;

  if (isKotibiyatDirectFlow(doc)) {
    return isUserAuthorSigned(doc) || doc.status === DocumentStatus.APPROVED;
  }

  if (!isUserAuthorSigned(doc)) return false;
  if (doc.status === DocumentStatus.APPROVED) return true;
  if (isCommanderSigned(doc)) return true;
  return false;
}

/** Ro‘yxatga olish navbatida — yuborilgan hujjat (submit API dan keyin) */
export function isKotibiyatRegistrationListItem(
  doc: WorkflowDocument,
  province: string
): boolean {
  if (!regionsMatch(doc.ownerRegion, province)) return false;
  if (isTerminalStatus(doc.status)) return false;
  return isSubmittedToKotibiyatQueue(doc);
}

/**
 * Kotibiyat xodimiga tayinlangan (allowedUsers), lekin eski «share» orqali
 * submittedToKotibiyat o‘rnatilmagan hujjatlar.
 */
export function isKotibiyatAssignedInboxItem(
  doc: WorkflowDocument & { owner?: unknown; allowedUsers?: unknown[] },
  kotibiyatUserId: string,
  province: string
): boolean {
  if (!regionsMatch(doc.ownerRegion, province)) return false;
  if (isTerminalStatus(doc.status)) return false;
  if (isSubmittedToKotibiyatQueue(doc)) return true;

  const ownerId = resolveMongoId(doc.owner);
  if (ownerId && ownerId === kotibiyatUserId) return false;
  if (doc.status !== DocumentStatus.APPROVED) return false;
  if (!isUserAuthorSigned(doc) || !isCommanderSigned(doc)) return false;

  const allowed = (doc.allowedUsers ?? [])
    .map((uid) => resolveMongoId(uid))
    .filter((id): id is string => !!id);

  return allowed.includes(kotibiyatUserId);
}

export function isKotibiyatRegistrationEligible(
  doc: WorkflowDocument,
  adminProvince?: string,
): boolean {
  if (!isKotibiyatQueueVisible(doc, adminProvince ?? doc.ownerRegion ?? '')) {
    return false;
  }

  if (isKotibiyatDirectFlow(doc)) {
    return true;
  }

  return wasSentToCommander(doc);
}

export function canUserSubmitToKotibiyat(doc: WorkflowDocument): boolean {
  if (isKotibiyatDirectFlow(doc)) return false;
  if (isMarkedForKotibiyat(doc)) return false;
  if (!isUserAuthorSigned(doc)) return false;
  if (!isCommanderSigned(doc)) return false;
  if (!isForwardQueueComplete(doc)) return false;
  if (doc.status !== DocumentStatus.APPROVED) return false;
  return doc.sentToCommander === true;
}

/** Mahalliy komandir navbati — user yaratgan, shu viloyat */
export function commanderLocalInboxFilter(province: string) {
  const escaped = province.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    ownerRegion: { $regex: new RegExp(`^${escaped}$`, 'i') },
    createdByKotibiyat: { $ne: true },
    submittedToKotibiyat: { $ne: true },
    sharedWithAdmin: { $ne: true },
    sentToCommander: true,
    status: {
      $in: [
        DocumentStatus.YANGI,
        DocumentStatus.CREATED,
        DocumentStatus.IN_PROGRESS,
        DocumentStatus.IN_PROGRESS_FORWARD,
        DocumentStatus.SIGNED,
      ],
    },
  };
}

export function kotibiyatRegistrationQueueFilter(province: string) {
  const escaped = province.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    ownerRegion: { $regex: new RegExp(`^${escaped}$`, 'i') },
    isCopy: { $ne: true },
    status: { $nin: TERMINAL_STATUSES },
    $or: [
      { createdByKotibiyat: true },
      { submittedToKotibiyat: true },
      { sharedWithAdmin: true },
    ],
  };
}

/** Boshqa viloyatdan kelgan nusxa — maqsad viloyat kotibiyat navbati */
export function kotibiyatRegionalCopyInboxFilter(province: string) {
  const escaped = province.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    ownerRegion: { $regex: new RegExp(`^${escaped}$`, 'i') },
    isCopy: true,
    parentId: { $exists: true, $ne: null },
    submittedToKotibiyat: true,
    createdByKotibiyat: true,
    status: { $nin: TERMINAL_STATUSES },
  };
}

export function isKotibiyatRegionalCopyInboxItem(
  doc: WorkflowDocument & { isCopy?: boolean; parentId?: unknown }
): boolean {
  return doc.isCopy === true && !!resolveMongoId(doc.parentId);
}

/** Kotibiyatga yuborilgan, ro‘yxatga olish navbatidagi hujjat */
export function isSubmittedToKotibiyatQueue(doc: WorkflowDocument): boolean {
  return (
    doc.submittedToKotibiyat === true ||
    (doc.sharedWithAdmin === true && doc.sentToCommander !== false)
  );
}

type ReceiverLike = {
  userId?: unknown;
  user?: { userId?: unknown; _id?: unknown };
};

function collectReceiverUserIds(receivers?: ReceiverLike[] | null): string[] {
  if (!Array.isArray(receivers)) return [];
  return receivers
    .map((r) => resolveMongoId(r.userId ?? r.user?.userId ?? r.user?._id))
    .filter((id): id is string => !!id);
}

function collectAllowedUserIds(allowed?: unknown[] | null): string[] {
  if (!Array.isArray(allowed)) return [];
  return allowed
    .map((u) => resolveMongoId(u))
    .filter((id): id is string => !!id);
}

/** Hujjat boshqa viloyatdan kelgan (manba viloyat komandir viloyati bilan mos emas). */
export function isExternalRegionDocument(
  doc: WorkflowDocument,
  commanderProvince: string,
): boolean {
  const region = doc.ownerRegion?.trim();
  if (!region) return false;
  return !regionsMatch(region, commanderProvince);
}

/** Kotibiyat kanali orqali komandirga yuborilgan. */
export function isKotibiyatDispatchChannel(doc: WorkflowDocument): boolean {
  if (doc.createdByKotibiyat === true) return true;
  return isMarkedForKotibiyat(doc);
}

/** Hujjat ushbu komandirga yuborilgan (qabul qiluvchi yoki komandir navbati). */
export function isAddressedToCommander(
  doc: WorkflowDocument & {
    receiver?: ReceiverLike[];
    allowedUsers?: unknown[];
  },
  commanderUserId: string,
): boolean {
  const uid = commanderUserId.toString();
  if (doc.sentToCommander === true) return true;

  if (collectReceiverUserIds(doc.receiver).includes(uid)) return true;
  if (collectAllowedUserIds(doc.allowedUsers).includes(uid)) return true;

  const queue = doc.forwardedTo;
  if (Array.isArray(queue)) {
    for (const item of queue) {
      const entry =
        typeof item === 'object' && item !== null ?
          (item as { userId?: unknown })
        : null;
      if (entry && resolveMongoId(entry.userId) === uid) return true;
    }
  }

  return false;
}

/** Komandir «Kelgan hujjatlar»: boshqa viloyatdan, kotibiyat yuborgan. */
export function isCommanderExternalInboxDocument(
  doc: WorkflowDocument & {
    receiver?: ReceiverLike[];
    allowedUsers?: unknown[];
  },
  commanderProvince: string,
  commanderUserId: string,
): boolean {
  if (!isExternalRegionDocument(doc, commanderProvince)) return false;
  if (!isKotibiyatDispatchChannel(doc)) return false;
  if (!isAddressedToCommander(doc, commanderUserId)) return false;
  if (isTerminalStatus(doc.status)) return false;
  return true;
}

export function commanderExternalInboxFilter(
  commanderProvince: string,
  commanderUserId: string,
) {
  const escaped = commanderProvince
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const commanderObjectId = resolveMongoId(commanderUserId);

  return {
    ownerRegion: { $not: new RegExp(`^${escaped}$`, 'i') },
    status: {
      $nin: [
        DocumentStatus.DELETED,
        DocumentStatus.ARCHIVED,
        DocumentStatus.REGISTERED,
      ],
    },
    $and: [
      {
        $or: [
          { createdByKotibiyat: true },
          { submittedToKotibiyat: true },
          { sharedWithAdmin: true },
        ],
      },
      {
        $or: [
          { sentToCommander: true },
          ...(commanderObjectId ?
            [
              { 'receiver.userId': commanderObjectId },
              { allowedUsers: commanderObjectId },
            ]
          : []),
        ],
      },
    ],
  };
}

/** @deprecated Eski filtr — mahalliy user hujjatlari. `commanderExternalInboxFilter` ishlating. */
export function commanderInboxFilter(province: string) {
  return commanderExternalInboxFilter(province, '');
}
