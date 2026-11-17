import bcrypt from 'bcryptjs';

export const PASSWORD_MIN_LENGTH = 12;
/** bcrypt faqat birinchi 72 baytni hisobga oladi */
export const PASSWORD_MAX_BYTES = 72;
export const BCRYPT_COST = 12;

/** Yangi parol uchun qoida; xato bo‘lsa foydalanuvchiga ko‘rsatiladigan matn qaytadi */
export function validateNewPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Parol kamida ${PASSWORD_MIN_LENGTH} belgidan iborat bo‘lishi kerak`;
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    return `Parol ko‘pi bilan ${PASSWORD_MAX_BYTES} baytdan iborat bo‘lishi kerak`;
  }
  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password)) {
    return 'Parolda kamida bitta harf va bitta raqam bo‘lishi kerak';
  }
  return null;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function passwordHashNeedsUpgrade(hash: string): boolean {
  const cost = Number.parseInt(hash.split('$')[2] ?? '', 10);
  return !Number.isInteger(cost) || cost < BCRYPT_COST;
}
