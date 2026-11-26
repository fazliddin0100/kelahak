export type DocumentTemplateKey =
  | 'xat'
  | 'dalolatnoma'
  | 'malumotnoma'
  | 'bildirgi'
  | 'buyruq';

const MATCHERS: { key: DocumentTemplateKey; patterns: RegExp[] }[] = [
  { key: 'malumotnoma', patterns: [/ma['’‘ʼ`]?lumotnoma/i, /malumotnoma/i] },
  { key: 'dalolatnoma', patterns: [/dalolatnoma/i] },
  { key: 'bildirgi', patterns: [/bildirgi/i] },
  { key: 'buyruq', patterns: [/buyruq/i] },
  { key: 'xat', patterns: [/^xat$/i, /\bxat\b/i, /yollov/i, /yo['’‘ʼ`]?llov/i] },
];

export function resolveTemplateKeyFromTitle(
  title?: string | null
): DocumentTemplateKey | null {
  const raw = (title ?? '').trim();
  if (!raw) return null;
  for (const { key, patterns } of MATCHERS) {
    if (patterns.some((p) => p.test(raw))) return key;
  }
  return null;
}

/** Galereyadagi "Yangi hujjat" (shablonsiz) uchun boshlang'ich sarlavha. */
export const BLANK_DOCUMENT_TITLE = 'yangi hujjat';

export const TEMPLATE_LABELS: Record<DocumentTemplateKey, string> = {
  xat: 'Xat',
  dalolatnoma: 'Dalolatnoma',
  malumotnoma: 'Ma’lumotnoma',
  bildirgi: 'Bildirgi',
  buyruq: 'Buyruq',
};

/**
 * Hujjat turini user o'zi yozadimi: faqat shablonsiz (Yangi hujjat) hujjatlarda.
 * Shablonli hujjatlarning turi shablon nomi bilan belgilangan va o'zgarmaydi.
 */
export function isCustomTypeDocument(title?: string | null): boolean {
  return resolveTemplateKeyFromTitle(title) === null;
}

/** Shablonsiz hujjat turi hali kiritilmaganmi ("yangi hujjat" yoki bo'sh). */
export function isBlankDocumentType(title?: string | null): boolean {
  const t = (title ?? '').trim().toLowerCase();
  return t === '' || t === BLANK_DOCUMENT_TITLE;
}

/** Yangi hujjat uchun kiritilgan tur to'g'rimi. Xato bo'lsa — xabar, aks holda null. */
export function validateCustomDocumentType(value: string): string | null {
  const v = value.trim();
  if (isBlankDocumentType(v)) return 'Hujjat turini kiriting (masalan: Bildirgi, Taqdimnoma, Hisobot).';
  if (v.length > 120) return 'Hujjat turi 120 belgidan oshmasin.';
  return null;
}

/**
 * "Yangi hujjat" da yozilgan tur tayyor shablonga (Bildirgi, Xat, ...) mos kelsa — shablon nomiga
 * keltiriladi va hujjat shu shablon ko'rinishini oladi. Aks holda yozilgani o'zi (shaxsiy tur).
 */
export function normalizeDocumentType(value: string): string {
  const v = value.trim();
  const key = resolveTemplateKeyFromTitle(v);
  return key ? TEMPLATE_LABELS[key] : v;
}
