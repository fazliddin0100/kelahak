import { unblockIpPersistent } from '@/lib/ipBlocklist';
import { unblockIp } from '@/lib/waf';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { ip } = await request.json();
  const target = String(ip ?? '').trim();
  unblockIp(target);
  await unblockIpPersistent(target);
  return NextResponse.json({ message: `IP ${target} blokdan chiqarildi` });
}
