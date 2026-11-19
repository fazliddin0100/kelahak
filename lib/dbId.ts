/** Baza ID formati: 24 belgili o'n oltilik satr. Server ham, brauzer ham ishlata oladi. */
const DB_ID_RE = /^[a-f0-9]{24}$/i;

export function isValidDbId(id: string): boolean {
  return DB_ID_RE.test(id);
}
