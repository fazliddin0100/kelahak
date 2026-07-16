import { blockIpPersistent } from '@/lib/ipBlocklist';
import { logSecurityEvent } from '@/lib/securityLog';
import { blockIp } from '@/lib/waf';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const target = String(body.ip ?? '').trim();
  const reason = body.reason ? String(body.reason) : 'SuperAdmin blokladi';

  if (!target) {
    return NextResponse.json({ message: 'IP kerak' }, { status: 400 });
  }

  blockIp(target);
  await blockIpPersistent(target, {
    reason,
    blockedBy: auth.userId,
    source: body.source ? String(body.source) : 'superadmin',
  });

  await logSecurityEvent({
    type: 'waf_block',
    ip: target,
    path: '/api/waf/block',
    method: 'POST',
    message: reason,
    loginHint: auth.userId,
  });

  return NextResponse.json({ message: `IP ${target} bloklandi` });
}
