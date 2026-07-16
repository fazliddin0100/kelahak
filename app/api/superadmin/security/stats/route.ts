import { getSecurityStats } from '@/lib/securityLog';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const hours = Math.min(
    Number(request.nextUrl.searchParams.get('hours') || 24),
    168
  );
  const stats = await getSecurityStats(hours);
  return NextResponse.json(stats);
}
