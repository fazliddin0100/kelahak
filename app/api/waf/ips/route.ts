import { getBlockedIpList } from '@/lib/ipBlocklist';
import { getBlockedIps, getSeenIps } from '@/lib/waf';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const dbBlocked = await getBlockedIpList();
  const memBlocked = getBlockedIps();

  return NextResponse.json({
    seen: getSeenIps(),
    blocked: Array.from(new Set([...dbBlocked, ...memBlocked])),
  });
}
