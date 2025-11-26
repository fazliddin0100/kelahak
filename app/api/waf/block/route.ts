import { NextResponse } from 'next/server';
import { blockIp } from '@/lib/waf';

export async function POST(req: Request) {
  const { ip } = await req.json();
  blockIp(String(ip));
  return NextResponse.json({ message: `IP ${ip} bloklandi` });
}
