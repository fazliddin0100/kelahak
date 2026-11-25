/**
 * Hujjat imzolashda kalit parolini 1 soat eslab qolish.
 *
 * Birinchi imzoda kalit paroli so'raladi; ochilgan kalit (chiqarib bo'lmaydigan CryptoKey) va
 * sertifikat faqat shu sahifa xotirasida (JS o'zgaruvchisida) turadi. Parol kiritilganidan
 * 1 soat o'tgach yoki sahifa yangilanganda / tab yopilganda / tizimdan chiqilganda o'chadi
 * va parol yana so'raladi. localStorage, sessionStorage, IndexedDB yoki cookie ishlatilmaydi.
 */

export const SIGN_SESSION_MS = 60 * 60 * 1000;

type SignSession = {
  key: CryptoKey;
  certPem: string;
  /** Kalit fayli nomi — oynada qaysi kalit ochiqligini ko'rsatish uchun */
  label: string;
  expiresAt: number;
};

let session: SignSession | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function clearSignSession(): void {
  session = null;
  if (timer) clearTimeout(timer);
  timer = null;
}

/** Parol kiritilgan payt (hozir) dan 1 soat amal qiladi */
export function startSignSession(key: CryptoKey, certPem: string, label: string): void {
  clearSignSession();
  session = { key, certPem, label, expiresAt: Date.now() + SIGN_SESSION_MS };
  timer = setTimeout(clearSignSession, SIGN_SESSION_MS);
}

/** Amaldagi seans (muddati o'tgan bo'lsa — o'chirilib, null) */
export function getSignSession(): Readonly<SignSession> | null {
  if (session && Date.now() >= session.expiresAt) clearSignSession();
  return session;
}
