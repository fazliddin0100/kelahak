/** Bazada saqlanadigan rollar — bitta manba */
export const DB_ROLES = [
  'admin',
  'superAdmin',
  'user',
  'commander',
  'deputyCommander',
  'departmentCommander',
  'departmentDeputy',
] as const;

export type DbRole = (typeof DB_ROLES)[number];

/** Komandir paneli (/komandir) rollari */
export const COMMANDER_ROLES: readonly DbRole[] = [
  'commander',
  'deputyCommander',
  'departmentCommander',
  'departmentDeputy',
];

/** detectRole natijasini bazaga yozish uchun normalizatsiya */
export function normalizeRoleForDb(detected: string): DbRole {
  if (detected === 'admin' || detected === 'superAdmin') {
    return detected;
  }
  if ((COMMANDER_ROLES as readonly string[]).includes(detected)) {
    return detected as DbRole;
  }
  return 'user';
}

export function isCommanderRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return (COMMANDER_ROLES as readonly string[]).includes(role);
}

/** Kotibiyat paneli (/kotibiyat) — admin yoki kotibiyat roli */
export function isKotibiyatStaffRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'kotibiyat' || role === 'superAdmin';
}
