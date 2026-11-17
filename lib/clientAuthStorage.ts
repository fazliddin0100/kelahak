const LEGACY_KEYS = ['token', 'ref_token', 'sa_token', 'csrf-token'];

/** Removes auth tokens that older versions kept in web storage. Tokens now live only in HttpOnly cookies. */
export function clearLegacyAuthStorage(): void {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      for (const key of LEGACY_KEYS) storage.removeItem(key);
    } catch {
      // storage can be unavailable (private mode / disabled)
    }
  }
}
