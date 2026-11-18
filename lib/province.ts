import type { Prisma } from '@prisma/client';
import { provinces } from '@/lib/registrationConstants';

/** Apostrof turlari (’ ʻ ' `) yagona ‘ ga keltiriladi, katta-kichik harf farqi olib tashlanadi. */
function normalize(value: string): string {
  return value.trim().replace(/[’ʻ'`]/g, '‘').toLowerCase();
}

const CANONICAL = new Map<string, string>(provinces.map((p) => [normalize(p), p]));

/** Ro'yxatdagi rasmiy viloyat nomi yoki null. */
export function canonicalProvince(value: string | null | undefined): string | null {
  if (!value) return null;
  return CANONICAL.get(normalize(value)) ?? null;
}

/**
 * Viloyat bo'yicha filtr. Rasmiy nom topilsa — aniq tenglik (indeks ishlaydi);
 * aks holda eski xatti-harakat: katta-kichik harfga befarq solishtirish.
 * Bazadagi qiymatlar migratsiya orqali rasmiy nomlarga keltirilgan.
 */
export function provinceWhere(value: string): Prisma.StringFilter {
  const canonical = canonicalProvince(value);
  return canonical ? { equals: canonical } : { equals: value.trim(), mode: 'insensitive' };
}
