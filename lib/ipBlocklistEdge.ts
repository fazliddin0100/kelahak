import { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/clientIp';
import {
  getInternalKey,
  INTERNAL_KEY_HEADER,
  internalUrl,
} from '@/lib/internalKeys';

const CACHE_MS = 30_000;

type BlockCache = { ips: Set<string>; at: number };

const globalStore = globalThis as typeof globalThis & {
  __blockedIpCache?: BlockCache;
};

/** Edge middleware — IP block list is loaded through the internal API */
export async function isRequestIpBlocked(req: NextRequest): Promise<boolean> {
  if (process.env.NODE_ENV === 'development') {
    return false;
  }
  const ip = getClientIp(req.headers);
  const now = Date.now();
  const cache = globalStore.__blockedIpCache;

  if (cache && now - cache.at < CACHE_MS) {
    return cache.ips.has(ip);
  }

  try {
    const res = await fetch(internalUrl('/api/waf/blocked-list'), {
      headers: {
        [INTERNAL_KEY_HEADER['waf-sync']]: await getInternalKey('waf-sync'),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`IP blok ro‘yxati yuklanmadi: HTTP ${res.status}`);
      return cache?.ips.has(ip) ?? false;
    }

    const data = (await res.json()) as { blocked?: string[] };
    const ips = new Set(data.blocked ?? []);
    globalStore.__blockedIpCache = { ips, at: now };
    return ips.has(ip);
  } catch (error) {
    console.error('IP blok ro‘yxati yuklanmadi:', error);
    return cache?.ips.has(ip) ?? false;
  }
}

export function getMiddlewareClientIp(req: NextRequest): string {
  return getClientIp(req.headers);
}
