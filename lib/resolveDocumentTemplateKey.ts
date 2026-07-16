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
