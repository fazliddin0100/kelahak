const LEGACY_KEYS = [
  'token',
  'ref_token',
  'sa_token',
  'csrf-token',
  // TinyMCE ilgari tanlangan ranglarni saqlagan (endi custom_colors: false)
  'tinymce-custom-colors-forecolor',
  'tinymce-custom-colors-hilitecolor',
];

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
