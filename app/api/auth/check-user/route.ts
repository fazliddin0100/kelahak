import { getClientIp } from '@/lib/clientIp';
import { authLoginExists } from '@/lib/db/user';
import { consumeRateLimit } from '@/lib/rateLimit';
import { NextRequest, NextResponse } from 'next/server';

const CHECKS_PER_IP_PER_MINUTE =
  process.env.NODE_ENV === 'development' ? 300 : 20;

export async function GET(request: NextRequest) {
  const limit = consumeRateLimit(
    'check-user-ip',
    getClientIp(request.headers),
    CHECKS_PER_IP_PER_MINUTE,
    60_000
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { message: 'Juda ko‘p so‘rov. Keyinroq urinib ko‘ring.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const login = request.nextUrl.searchParams.get('login')?.trim() ?? '';
  if (!/^[a-z0-9_-]{3,50}$/i.test(login)) {
    return NextResponse.json({ exists: false });
  }

  const exists = await authLoginExists(login);
  return NextResponse.json({ exists });
}
