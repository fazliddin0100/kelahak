import { COMMANDER_ROLES, type DbRole } from '@/lib/roles';

const ALL_PERMISSIONS = [
  'create_document',
  'edit_document',
  'create_user',
  'edit_user',
  'delete_user',
  'assign_roles',
  'view_document',
  'view_all_provinces',
  'register_document',
  'sign_document',
  'archive_document',
  'print_document',
] as const;

const COMMANDER_PERMISSIONS = [
  'create_document',
  'edit_document',
  'sign_document',
  'send_document',
  'archive_document',
  'view_document',
] as const;

/** Oddiy foydalanuvchi ruxsatlari */
const USER_PERMISSIONS = [
  'create_document',
  'edit_document',
  'sign_document',
  'send_document',
  'view_document',
] as const;

export const getPermissionsForRole = (roleName: string): string[] => {
  const role = roleName as DbRole;

  if (role === 'admin' || role === 'superAdmin') {
    return [...ALL_PERMISSIONS];
  }

  if ((COMMANDER_ROLES as readonly string[]).includes(role)) {
    return [...COMMANDER_PERMISSIONS];
  }

  return [...USER_PERMISSIONS];
};
