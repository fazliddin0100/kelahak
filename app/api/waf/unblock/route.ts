import { NextResponse } from 'next/server';
import { unblockIp } from '@/lib/waf';

export async function POST(req: Request) {
  const { ip } = await req.json();
  unblockIp(String(ip));
  return NextResponse.json({ message: `IP ${ip} unblock qilindi` });
}
