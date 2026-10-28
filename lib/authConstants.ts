/** Client/server authentication constants */

import { isKotibiyatStaffRole } from '@/lib/roles';

export const PENDING_ACCESS_MESSAGE =
  'Sizga tizimga kirish uchun hozircha ruxsat berilmagan';

/** Kotibiyat (admin) va superAdmin — ro‘yxatdan keyin darhol kiradi */
export function roleBypassesApproval(role: string): boolean {
  return isKotibiyatStaffRole(role);
}

export function canLoginWithoutApproval(
  role: string,
  isUserTrue: boolean
): boolean {
  return roleBypassesApproval(role) || Boolean(isUserTrue);
}
