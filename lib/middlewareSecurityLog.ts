import { getClientIp } from '@/lib/clientIp';
import {
  getInternalKey,
  INTERNAL_KEY_HEADER,
  internalUrl,
} from '@/lib/internalKeys';
import type { SecurityEventType } from '@/lib/securityLog';
import { NextRequest } from 'next/server';

const THROTTLE_MS = 30_000;
const throttleStore = new Map<string, number>();

function shouldThrottle(ip: string, path: string, type: SecurityEventType): boolean {
  const key = `${ip}|${path}|${type}`;
  const now = Date.now();
  const last = throttleStore.get(key);
  if (last && now - last < THROTTLE_MS) return true;
  throttleStore.set(key, now);
  if (throttleStore.size > 5000) {
    const cutoff = now - THROTTLE_MS * 2;
    for (const [k, t] of throttleStore.entries()) {
      if (t < cutoff) throttleStore.delete(k);
    }
    for (const k of throttleStore.keys()) {
      if (throttleStore.size <= 5000) break;
      throttleStore.delete(k);
    }
  }
  return false;
}

/** Faqat muhim hodisalar (visit emas) — productionda, cheklangan tezlikda */
export function queueSecurityLog(
  req: NextRequest,
  event: {
    type: SecurityEventType;
    message?: string;
    loginHint?: string;
    statusCode?: number;
  }
) {
  if (process.env.NODE_ENV === 'development') return;

  if (event.type === 'visit') return;

  const ip = getClientIp(req.headers);
  const path = req.nextUrl.pathname;
  if (shouldThrottle(ip, path.slice(0, 200), event.type)) return;

  const body = JSON.stringify({
    ...event,
    ip,
    path,
    method: req.method,
    userAgent: (req.headers.get('user-agent') || '').slice(0, 300),
  });

  void getInternalKey('security-log')
    .then((key) =>
      fetch(internalUrl('/api/security/log'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [INTERNAL_KEY_HEADER['security-log']]: key,
        },
        body,
      })
    )
    .catch((error) => {
      console.error('Xavfsizlik logi yozilmadi:', error);
    });
}

const BOT_UA =
  /bot|crawl|spider|curl|wget|python-requests|scrapy|headless|phantomjs/i;

export function isBotUserAgent(req: NextRequest): boolean {
  return BOT_UA.test(req.headers.get('user-agent') || '');
}
