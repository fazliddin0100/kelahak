import { isKeyOnUsb } from './agentClient';

/**
 * Hujjat imzolashda kalit parolini 1 soat eslab qolish.
 *
 * Birinchi imzoda kalit paroli so'raladi; ochilgan kalit (chiqarib bo'lmaydigan CryptoKey) va
 * sertifikat faqat shu sahifa xotirasida (JS o'zgaruvchisida) turadi. Parol kiritilganidan
 * 1 soat o'tgach yoki sahifa yangilanganda / tab yopilganda / tizimdan chiqilganda o'chadi
 * va parol yana so'raladi. localStorage, sessionStorage, IndexedDB yoki cookie ishlatilmaydi.
 *
 * Kalit fleshkadan ochilgan bo'lsa, Mezon agenti orqali har 5 soniyada fleshka tekshiriladi:
 * fleshka olib qo'yilishi bilan ochiq kalit xotiradan o'chiriladi. (Server ham har imzoda
 * agentdan fleshka tasdig'ini talab qiladi — bu tekshiruv faqat qulaylik va qo'shimcha himoya.)
 */

export const SIGN_SESSION_MS = 60 * 60 * 1000;
const USB_CHECK_MS = 5000;

type SignSession = {
  key: CryptoKey;
  certPem: string;
  /** Kalit fayli nomi — oynada qaysi kalit ochiqligini ko'rsatish uchun */
  label: string;
  /** Fleshkadagi kalit fayli SHA-256 (agent tasdig'i uchun) */
  keySha256: string;
  expiresAt: number;
};

let session: SignSession | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let usbTimer: ReturnType<typeof setInterval> | null = null;
/** Fleshka olinganligi sababli yopilgan — oynada tushuntirish uchun */
let closedByUsb = false;

export function clearSignSession(): void {
  session = null;
  if (timer) clearTimeout(timer);
  if (usbTimer) clearInterval(usbTimer);
  timer = null;
  usbTimer = null;
}

/** Parol kiritilgan payt (hozir) dan 1 soat amal qiladi */
export function startSignSession(key: CryptoKey, certPem: string, label: string, keySha256: string): void {
  clearSignSession();
  closedByUsb = false;
  const s: SignSession = { key, certPem, label, keySha256, expiresAt: Date.now() + SIGN_SESSION_MS };
  session = s;
  timer = setTimeout(clearSignSession, SIGN_SESSION_MS);
  if (!keySha256) return; // agentsiz (o'tish davri) — fleshka kuzatilmaydi
  usbTimer = setInterval(() => {
    void isKeyOnUsb(keySha256).then((present) => {
      if (!present && session === s) {
        clearSignSession();
        closedByUsb = true;
      }
    });
  }, USB_CHECK_MS);
}

/** Amaldagi seans (muddati o'tgan bo'lsa — o'chirilib, null) */
export function getSignSession(): Readonly<SignSession> | null {
  if (session && Date.now() >= session.expiresAt) clearSignSession();
  return session;
}

/** Oxirgi seans fleshka olib qo'yilgani uchun yopildimi (bir marta o'qiladi) */
export function takeClosedByUsb(): boolean {
  const v = closedByUsb;
  closedByUsb = false;
  return v;
}
