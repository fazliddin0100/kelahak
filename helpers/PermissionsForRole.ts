import { DB_ROLES, ROLE_DEFAULT_PERMISSIONS, type DbRole } from '@/lib/roles';

/** Rol uchun standart huquqlar (manba: lib/roles.ts). */
export const getPermissionsForRole = (roleName: string): string[] => {
  const role = ((DB_ROLES as readonly string[]).includes(roleName) ? roleName : 'user') as DbRole;
  return [...ROLE_DEFAULT_PERMISSIONS[role]];
};
