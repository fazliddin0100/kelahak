import { COMMANDER_ROLES, isCommanderRole, isKotibiyatStaffRole } from '@/lib/roles';

export type DocumentActionRoleGroup = 'kotibiyat' | 'commander' | 'user';

export function getDocumentActionRoleGroup(
  role: string | null | undefined
): DocumentActionRoleGroup | null {
  if (!role) return null;
  if (role === 'komandir' || isCommanderRole(role)) return 'commander';
  if (isKotibiyatStaffRole(role)) return 'kotibiyat';
  if (role === 'user') return 'user';
  return null;
}

export function getDocumentActionsHomeHref(
  group: DocumentActionRoleGroup | null
): string {
  switch (group) {
    case 'kotibiyat':
      return '/kotibiyat';
    case 'commander':
      return '/komandir';
    case 'user':
      return '/user';
    default:
      return '/';
  }
}

export function isCommanderRoleGroup(
  group: DocumentActionRoleGroup | null
): boolean {
  return group === 'commander';
}

/** Komandir paneli rollari matni */
export const COMMANDER_ROLE_LABELS = COMMANDER_ROLES;
