import type { SecurityEventType } from '@/lib/securityLog';
import { NextRequest } from 'next/server';

const THROTTLE_MS = 30_000;
const throttleStore = new Map<string, number>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

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

  const ip = getIp(req);
  const path = req.nextUrl.pathname;
  if (shouldThrottle(ip, path, event.type)) return;

  const key = process.env.SECURITY_LOG_KEY?.trim();
  if (!key) return;

  const url = new URL('/api/security/log', req.url);
  void fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-security-log-key': key,
    },
    body: JSON.stringify({
      ...event,
      ip,
      path,
      method: req.method,
      userAgent: (req.headers.get('user-agent') || '').slice(0, 300),
    }),
  }).catch(() => {});
}

const BOT_UA =
  /bot|crawl|spider|curl|wget|python-requests|scrapy|headless|phantomjs/i;

export function isBotUserAgent(req: NextRequest): boolean {
  return BOT_UA.test(req.headers.get('user-agent') || '');
}
