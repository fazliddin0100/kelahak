import type { ApiAuthSession } from '@/lib/apiAuth';
import {
  findDocumentById,
  type DocumentWithRelations,
  type FindDocumentOptions,
} from '@/lib/db/document';
import { regionsMatch } from '@/lib/documentWorkflow';
import { prisma } from '@/lib/prisma';
import { resolveIdReference } from '@/lib/resolveIdReference';
import { isCommanderRole, isKotibiyatStaffRole } from '@/lib/roles';
import { NextResponse } from 'next/server';

type AccessDocument = Pick<
  DocumentWithRelations,
  | 'ownerId'
  | 'ownerRegion'
  | 'sourceRegion'
  | 'forwardedById'
  | 'author'
  | 'sender'
  | 'receiver'
  | 'approvers'
  | 'bosSigned'
  | 'forwardedTo'
  | 'forwardedSigner'
  | 'ownerAcceptedBy'
  | 'sentToCommander'
  | 'submittedToKotibiyat'
  | 'sharedWithAdmin'
  | 'createdByKotibiyat'
  | 'registrationIndex'
> & {
  allowedUsers?: { userId: string }[];
  pendingTransferToId?: string | null;
  targetShahobchaId?: string | null;
};

export function actorProvince(auth: ApiAuthSession): string {
  return auth.user.personal?.province ?? '';
}

/** Kotibiyat xodimi: admin/superAdmin roli yoki kotibiyat bo‘limi */
export function isKotibiyatActor(auth: ApiAuthSession): boolean {
  return (
    isKotibiyatStaffRole(auth.role) ||
    auth.department.toLowerCase().includes('kotibiyat')
  );
}

export function isCommanderActor(auth: ApiAuthSession): boolean {
  return isCommanderRole(auth.role);
}

function jsonNamesUser(value: unknown, userId: string): boolean {
  if (!value) return false;
  if (Array.isArray(value)) {
    return value.some((item) => jsonNamesUser(item, userId));
  }
  if (typeof value === 'object') {
    return resolveIdReference((value as { userId?: unknown }).userId) === userId;
  }
  return false;
}

/** Hujjatda nomi ko‘rsatilgan ishtirokchi (imzolovchi, qabul qiluvchi, navbat) */
export function isDocumentParticipant(
  doc: AccessDocument,
  userId: string
): boolean {
  return [
    doc.author,
    doc.sender,
    doc.receiver,
    doc.approvers,
    doc.bosSigned,
    doc.forwardedTo,
    doc.forwardedSigner,
    doc.ownerAcceptedBy,
  ].some((field) => jsonNamesUser(field, userId));
}

/**
 * Hujjatni ko‘rish huquqi. Qoidalar:
 *  - egasi, yo‘naltirgan komandir, ruxsat berilganlar va ishtirokchilar;
 *  - kotibiyat: o‘z viloyatining kotibiyatga yuborilgan / ro‘yxatga olingan hujjatlari;
 *  - komandir: o‘z viloyatida komandirga yuborilgan hujjatlar.
 * `doc.allowedUsers` yuklangan bo‘lishi shart.
 */
export function canViewDocumentDirect(
  doc: AccessDocument,
  auth: ApiAuthSession
): boolean {
  const { userId } = auth;
  if (doc.ownerId === userId || doc.forwardedById === userId) return true;
  // Hujjat unga topshirilgan — qabul qilishdan oldin ko'rib chiqadi
  if (doc.pendingTransferToId && doc.pendingTransferToId === userId) return true;
  if (doc.allowedUsers?.some((row) => row.userId === userId)) return true;
  if (isDocumentParticipant(doc, userId)) return true;

  const province = actorProvince(auth);

  if (isKotibiyatActor(auth)) {
    const registered = doc.registrationIndex != null;
    const inKotibiyatChannel =
      doc.createdByKotibiyat ||
      doc.submittedToKotibiyat ||
      doc.sharedWithAdmin ||
      registered;
    // Korxonaga manzillangan nusxani boshqa korxona kotibiyati ochmaydi
    const otherOrganization =
      !!doc.targetShahobchaId && doc.targetShahobchaId !== (auth.user.job?.shahobchaId ?? null);
    if (
      inKotibiyatChannel &&
      !otherOrganization &&
      (regionsMatch(doc.ownerRegion, province) ||
        (registered && regionsMatch(doc.sourceRegion, province)))
    ) {
      return true;
    }
  }

  // Boshliq: o'z viloyati hujjatini faqat muallif imzolagandan keyin ko'radi
  const signedBy = (v: unknown) =>
    !!v && typeof v === 'object' && (v as { hasSigned?: boolean }).hasSigned === true;
  if (
    isCommanderActor(auth) &&
    doc.sentToCommander === true &&
    regionsMatch(doc.ownerRegion, province) &&
    (signedBy(doc.author) || signedBy(doc.sender) || signedBy(doc.bosSigned))
  ) {
    return true;
  }

  return false;
}

/** Hujjat foydalanuvchi ko‘ra oladigan boshqa hujjatga ilova qilinganmi */
async function isAttachmentOfViewableDocument(
  documentId: string,
  auth: ApiAuthSession
): Promise<boolean> {
  const links = await prisma.documentAttachment.findMany({
    where: { attachmentId: documentId },
    select: { document: { include: { allowedUsers: true } } },
    take: 100,
  });
  return links.some((link) => canViewDocumentDirect(link.document, auth));
}

export async function canViewDocument(
  doc: AccessDocument & { id: string },
  auth: ApiAuthSession
): Promise<boolean> {
  if (canViewDocumentDirect(doc, auth)) return true;
  return isAttachmentOfViewableDocument(doc.id, auth);
}

/** Hujjatni yuklaydi; ko‘rish huquqi bo‘lmasa `null` (mavjudligi oshkor qilinmaydi). */
export async function loadViewableDocument(
  id: string,
  auth: ApiAuthSession,
  options: FindDocumentOptions = {}
): Promise<DocumentWithRelations | null> {
  const document = await findDocumentById(id, {
    ...options,
    includeAllowedUsers: true,
  });
  if (!document) return null;
  return (await canViewDocument(document, auth)) ? document : null;
}

export function documentNotFoundResponse(): NextResponse {
  return NextResponse.json({ message: 'Hujjat topilmadi' }, { status: 404 });
}

/**
 * Ilova qilinadigan hujjatlar: faqat foydalanuvchi o‘zi ko‘ra oladiganlari
 * (aks holda begona hujjatni ilova qilib, uni o‘qib olish mumkin bo‘lardi).
 * `keepIds` — allaqachon biriktirilgan ilovalar, ular saqlanib qoladi.
 */
export async function filterAttachableDocumentIds(
  ids: string[],
  auth: ApiAuthSession,
  keepIds: readonly string[] = []
): Promise<string[]> {
  const unique = [...new Set(ids)];
  const toCheck = unique.filter((id) => !keepIds.includes(id));
  if (toCheck.length === 0) return unique;

  const candidates = await prisma.document.findMany({
    where: { id: { in: toCheck } },
    include: { allowedUsers: true },
  });
  const viewable = new Set(
    candidates
      .filter((doc) => canViewDocumentDirect(doc, auth))
      .map((doc) => doc.id)
  );
  return unique.filter((id) => keepIds.includes(id) || viewable.has(id));
}
