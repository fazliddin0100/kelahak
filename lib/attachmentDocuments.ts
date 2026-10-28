import { normalizeDocumentContent } from '@/lib/normalizeDocumentContent';
import { attachmentTextToFormIds } from '@/lib/parseAttachmentTextIds';
import type { DocumentAttachmentRef, DocumentType } from '@/types/document';

/** API JSON reference shapes: string | { $oid } | { _id } | populated document */
export function extractAttachmentIds(input: unknown): string[] {
  return attachmentTextToFormIds(
    Array.isArray(input) ? input : input ? [input] : []
  );
}

function refId(item: unknown): string {
  if (typeof item === 'string') return item.trim();
  if (!item || typeof item !== 'object') return '';
  const o = item as Record<string, unknown>;
  if (typeof o.$oid === 'string') return o.$oid;
  if (o._id != null) return String(o._id);
  return '';
}

/** Populate qilingan yoki API dan kelgan ilovani DocumentType ga */
export function toAttachmentDocument(item: unknown): DocumentType | null {
  if (!item || typeof item !== 'object') return null;

  const o = item as Record<string, unknown>;
  const id = refId(item);
  if (!id) return null;

  const hasBody = typeof o.title === 'string' || o.content !== undefined;
  if (!hasBody) return null;

  const base = item as DocumentType;
  return {
    ...base,
    _id: id,
    title: (o.title as string) ?? base.title ?? '',
    content: normalizeDocumentContent(o.content ?? base.content),
    grif: (o.grif as string) ?? base.grif ?? '',
    ownerRegion: (o.ownerRegion as string) ?? base.ownerRegion ?? '',
    registrationIndex:
      (o.registrationIndex as string | number) ?? base.registrationIndex,
    entryIndex: base.entryIndex ?? '',
    province: base.province ?? (o.ownerRegion as string) ?? '',
    position: base.position ?? '',
    militaryRank: base.militaryRank ?? '',
    fullName: base.fullName ?? '',
    onSign: base.onSign ?? (() => undefined),
  };
}

export function getPopulatedAttachments(
  document: DocumentType
): DocumentType[] {
  const raw = document.attachmentText ?? [];
  const out: DocumentType[] = [];

  for (const item of raw) {
    if (
      !item ||
      typeof item !== 'object' ||
      !Object.prototype.hasOwnProperty.call(item, 'content')
    ) {
      continue;
    }

    const doc = toAttachmentDocument(item);
    if (doc) out.push(doc);
  }

  return out;
}

export function isAttachmentRef(item: unknown): item is DocumentAttachmentRef {
  if (!item || typeof item !== 'object') return false;
  const o = item as Record<string, unknown>;
  return typeof o.title === 'string';
}
