import { resolveIdReference } from '@/lib/resolveIdReference';
import { isCommanderRole, isKotibiyatStaffRole } from '@/lib/roles';

type ShareableDocument = {
  owner?: unknown;
  allowedUsers?: unknown[];
};

/** Hujjatni boshqa foydalanuvchiga ko‘rish uchun yuborish */
export function canGrantDocumentViewAccess(
  doc: ShareableDocument,
  userId: string,
  role?: string | null
): boolean {
  if (!userId) return false;
  if (resolveIdReference(doc.owner) === userId) return true;
  if (
    Array.isArray(doc.allowedUsers) &&
    doc.allowedUsers.some((u) => resolveIdReference(u) === userId)
  ) {
    return true;
  }
  if (isKotibiyatStaffRole(role)) return true;
  if (isCommanderRole(role)) return true;
  return false;
}
