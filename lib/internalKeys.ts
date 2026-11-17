/** Edge- and Node-safe helpers for the middleware ↔ API internal calls. */

export type InternalKeyPurpose = 'security-log' | 'waf-sync';

const ENV_OVERRIDE: Record<InternalKeyPurpose, string> = {
  'security-log': 'SECURITY_LOG_KEY',
  'waf-sync': 'WAF_SYNC_KEY',
};

export const INTERNAL_KEY_HEADER: Record<InternalKeyPurpose, string> = {
  'security-log': 'x-security-log-key',
  'waf-sync': 'x-waf-sync-key',
};

const cache = new Map<InternalKeyPurpose, string>();

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

/**
 * Uses the configured key when present; otherwise derives one from JWT_SECRET
 * so the internal channel is never left open or silently disabled.
 */
export async function getInternalKey(
  purpose: InternalKeyPurpose
): Promise<string> {
  const cached = cache.get(purpose);
  if (cached) return cached;

  const configured = process.env[ENV_OVERRIDE[purpose]]?.trim();
  let key = configured;
  if (!key) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET muhit o‘zgaruvchisi topilmadi.');
    const encoder = new TextEncoder();
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    key = toHex(
      await crypto.subtle.sign(
        'HMAC',
        hmacKey,
        encoder.encode(`mezon-internal:${purpose}`)
      )
    );
  }

  cache.set(purpose, key);
  return key;
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function verifyInternalKey(
  request: Request,
  purpose: InternalKeyPurpose
): Promise<boolean> {
  const provided = request.headers.get(INTERNAL_KEY_HEADER[purpose]);
  if (!provided) return false;
  return timingSafeEqualString(provided, await getInternalKey(purpose));
}

/**
 * Internal calls go to the local listener, never to a host taken from the
 * request (a forged Host header must not receive the internal key).
 */
export function internalUrl(path: string): string {
  const base =
    process.env.INTERNAL_BASE_URL?.trim().replace(/\/+$/, '') ||
    `http://127.0.0.1:${process.env.PORT || '3001'}`;
  return `${base}${path}`;
}
