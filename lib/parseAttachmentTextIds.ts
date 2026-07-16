import { isValidDbId } from '@/lib/db/user';

/** API / formadan kelgan ilova ID larini string massiviga */
export function parseAttachmentTextIds(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : input ? [input] : [];

  return raw
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const o = item as { _id?: unknown; $oid?: string };
        if (typeof o.$oid === 'string') return o.$oid;
        if (o._id != null) return String(o._id);
      }
      return '';
    })
    .filter((id) => isValidDbId(id));
}

/** Tahrirlash formasi uchun string ID lar */
export function attachmentTextToFormIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const o = item as { $oid?: string; _id?: unknown };
        if (typeof o.$oid === 'string') return o.$oid.trim();
        if (o._id != null) {
          const id = o._id;
          return typeof id === 'string' ? id : String(id);
        }
      }
      return '';
    })
    .filter((id) => isValidDbId(id));
}
