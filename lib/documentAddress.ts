/**
 * Hujjat yuborish manzili (copyNumber elementi):
 *  - yangi: tizimda ro'yxatdan o'tgan korxona — "Nomi (Viloyat)"
 *  - eski: faqat viloyat nomi — "Andijon" (viloyat kotibiyatiga)
 * Viloyat nomlarida qavs yo'q, shuning uchun oxirgi "(...)" viloyat hisoblanadi.
 */
export type ParsedAddress =
  | { kind: 'organization'; name: string; province: string; label: string }
  | { kind: 'region'; province: string; label: string };

export function organizationAddressLabel(name: string, province: string): string {
  return `${name.trim()} (${province.trim()})`;
}

export function parseDocumentAddress(value: string): ParsedAddress {
  const label = String(value ?? '').trim();
  const m = /^(.*\S)\s*\(([^()]+)\)$/.exec(label);
  if (m) return { kind: 'organization', name: m[1].trim(), province: m[2].trim(), label };
  return { kind: 'region', province: label, label };
}
