const FALLBACK_IP = '127.0.0.1';
const IP_PATTERN = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]{2,45})$/i;

function trustedProxyHops(): number {
  const raw = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? '', 10);
  return Number.isInteger(raw) && raw >= 0 && raw <= 10 ? raw : 1;
}

function normalizeIp(value: string | null | undefined): string | null {
  const trimmed = value?.trim().replace(/^::ffff:/i, '');
  return trimmed && IP_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * Client IP as reported by our own reverse proxy.
 * The left side of X-Forwarded-For is written by the client, so only the
 * entries appended by trusted proxies (counted from the right) are used.
 * TRUSTED_PROXY_HOPS=0 means there is no proxy and no header is trusted.
 */
export function getClientIp(headers: Headers): string {
  const hops = trustedProxyHops();
  if (hops === 0) return FALLBACK_IP;

  const chain = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (chain.length >= hops) {
    return normalizeIp(chain[chain.length - hops]) ?? FALLBACK_IP;
  }
  if (chain.length === 0) {
    return normalizeIp(headers.get('x-real-ip')) ?? FALLBACK_IP;
  }
  return FALLBACK_IP;
}
