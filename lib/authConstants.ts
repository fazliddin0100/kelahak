/** Client/server authentication constants */

export const PENDING_ACCESS_MESSAGE =
  'Sizga tizimga kirish uchun hozircha ruxsat berilmagan';

/**
 * Faqat superAdmin tasdiqsiz kiradi (u tizimda bitta bo‘ladi va alohida
 * /superadmin/register sahifasida yaratiladi).
 * Kotibiyat (admin) roli ro‘yxatdan o‘tishda foydalanuvchi yozgan lavozimdan
 * aniqlanadi, shuning uchun u ham tasdiqlanishi shart.
 */
export function roleBypassesApproval(role: string): boolean {
  return role === 'superAdmin';
}

export function canLoginWithoutApproval(
  role: string,
  isUserTrue: boolean
): boolean {
  return roleBypassesApproval(role) || Boolean(isUserTrue);
}
