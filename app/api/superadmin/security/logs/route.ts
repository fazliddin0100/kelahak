import { getMergedSecurityLogs } from '@/lib/securityLog';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import type { SecurityEventType } from '@/lib/securityLog';
import { NextRequest, NextResponse } from 'next/server';

const VALID_TYPES: SecurityEventType[] = [
  'visit',
  'login_failed',
  'login_success',
  'rate_limit',
  'suspicious',
  'waf_block',
  'ddos',
];

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const limit = Math.min(
    Number(request.nextUrl.searchParams.get('limit') || 200),
    500
  );
  const typeParam = request.nextUrl.searchParams.get('type');
  const type =
    typeParam && VALID_TYPES.includes(typeParam as SecurityEventType)
      ? (typeParam as SecurityEventType)
      : undefined;

  const logs = await getMergedSecurityLogs(limit, type);

  return NextResponse.json({ logs, filter: type ?? null });
}
