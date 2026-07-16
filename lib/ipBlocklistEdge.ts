import { NextRequest } from 'next/server';

const CACHE_MS = 30_000;

type BlockCache = { ips: Set<string>; at: number };

const globalStore = globalThis as typeof globalThis & {
  __blockedIpCache?: BlockCache;
};

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

/** Edge middleware — MongoDB siz, ichki API orqali ro‘yxat */
export async function isRequestIpBlocked(req: NextRequest): Promise<boolean> {
  if (process.env.NODE_ENV === 'development') {
    return false;
  }
  const ip = getClientIp(req);
  const now = Date.now();
  const cache = globalStore.__blockedIpCache;

  if (cache && now - cache.at < CACHE_MS) {
    return cache.ips.has(ip);
  }

  try {
    const url = new URL('/api/waf/blocked-list', req.url);
    const key =
      process.env.WAF_SYNC_KEY?.trim() ||
      process.env.SECURITY_LOG_KEY?.trim() ||
      'dev-log-key';

    const res = await fetch(url.toString(), {
      headers: { 'x-waf-sync-key': key },
      cache: 'no-store',
    });

    if (!res.ok) return false;

    const data = (await res.json()) as { blocked?: string[] };
    const ips = new Set(data.blocked ?? []);
    globalStore.__blockedIpCache = { ips, at: now };
    return ips.has(ip);
  } catch {
    return false;
  }
}

export { getClientIp as getMiddlewareClientIp };
