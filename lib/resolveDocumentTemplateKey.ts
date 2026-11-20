export type DocumentTemplateKey =
  | 'xat'
  | 'dalolatnoma'
  | 'malumotnoma'
  | 'bildirgi'
  | 'buyruq';

const MATCHERS: { key: DocumentTemplateKey; patterns: RegExp[] }[] = [
  { key: 'malumotnoma', patterns: [/ma['']?lumotnoma/i, /malumotnoma/i] },
  { key: 'dalolatnoma', patterns: [/dalolatnoma/i] },
  { key: 'bildirgi', patterns: [/bildirgi/i] },
  { key: 'buyruq', patterns: [/buyruq/i] },
  { key: 'xat', patterns: [/^xat$/i, /\bxat\b/i, /yollov/i, /yo['']?llov/i] },
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
  if (isBlankDocumentType(v)) return 'Hujjat turini kiriting (masalan: Taqdimnoma, Hisobot).';
  if (v.length > 120) return 'Hujjat turi 120 belgidan oshmasin.';
  const key = resolveTemplateKeyFromTitle(v);
  if (key) {
    return `«${TEMPLATE_LABELS[key]}» uchun tayyor shablon bor — uni hujjatlar galereyasidan tanlang.`;
  }
  return null;
}
