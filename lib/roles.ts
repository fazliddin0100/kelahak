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

// ─── Huquqlar katalogi ─────────────────────────────────────────────────────

/** Tizimdagi barcha huquqlar va ularning foydalanuvchiga ko'rinadigan nomi. */
export const PERMISSIONS = {
  view_document: 'Hujjatlarni ko‘rish',
  create_document: 'Hujjat yaratish',
  edit_document: 'Hujjatni tahrirlash',
  sign_document: 'Hujjatni imzolash',
  send_document: 'Hujjatni yuborish',
  archive_document: 'Hujjatni arxivlash',
  print_document: 'Hujjatni chop etish',
  register_document: 'Hujjatni ro‘yxatga olish',
  create_user: 'Foydalanuvchi yaratish',
  edit_user: 'Foydalanuvchini tahrirlash',
  delete_user: 'Foydalanuvchini o‘chirish',
  assign_roles: 'Rol va huquq berish',
  view_all_provinces: 'Barcha viloyatlarni ko‘rish',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/** Shahobcha admini userga beradigan rollar (admin/superAdmin bu yerda yo'q). */
export const ASSIGNABLE_ROLES = [
  'user',
  'commander',
  'deputyCommander',
  'departmentCommander',
  'departmentDeputy',
] as const satisfies readonly DbRole[];

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<DbRole, string> = {
  superAdmin: 'SuperAdmin',
  admin: 'Shahobcha admini (kotibiyat)',
  user: 'Xodim',
  commander: 'Komandir',
  deputyCommander: 'Komandir o‘rinbosari',
  departmentCommander: 'Bo‘lim boshlig‘i',
  departmentDeputy: 'Bo‘lim boshlig‘i o‘rinbosari',
};

const USER_AVAILABLE: Permission[] = [
  'view_document',
  'create_document',
  'edit_document',
  'sign_document',
  'send_document',
  'print_document',
];

const COMMANDER_AVAILABLE: Permission[] = [...USER_AVAILABLE, 'archive_document'];

/** Har bir rol uchun admin belgilashi mumkin bo'lgan huquqlar. */
export const ROLE_AVAILABLE_PERMISSIONS: Record<DbRole, Permission[]> = {
  superAdmin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  user: USER_AVAILABLE,
  commander: COMMANDER_AVAILABLE,
  deputyCommander: COMMANDER_AVAILABLE,
  departmentCommander: COMMANDER_AVAILABLE,
  departmentDeputy: COMMANDER_AVAILABLE,
};

/** Ro'yxatdan o'tganda beriladigan standart huquqlar (admin keyin o'zgartiradi). */
export const ROLE_DEFAULT_PERMISSIONS: Record<DbRole, Permission[]> = {
  superAdmin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  user: ['view_document', 'create_document', 'edit_document', 'sign_document', 'send_document'],
  commander: ['view_document', 'create_document', 'edit_document', 'sign_document', 'send_document', 'archive_document'],
  deputyCommander: ['view_document', 'create_document', 'edit_document', 'sign_document', 'send_document', 'archive_document'],
  departmentCommander: ['view_document', 'create_document', 'edit_document', 'sign_document', 'send_document', 'archive_document'],
  departmentDeputy: ['view_document', 'create_document', 'edit_document', 'sign_document', 'send_document', 'archive_document'],
};

export function isAssignableRole(role: unknown): role is AssignableRole {
  return typeof role === 'string' && (ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

/** Faqat shu rolga ruxsat etilgan, takrorlanmagan huquqlarni qoldiradi. */
export function sanitizePermissions(role: DbRole, input: unknown): Permission[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set<string>(ROLE_AVAILABLE_PERMISSIONS[role]);
  return [...new Set(input.filter((p): p is Permission => typeof p === 'string' && allowed.has(p)))];
}
