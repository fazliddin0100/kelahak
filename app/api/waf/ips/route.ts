import { NextResponse } from 'next/server';
import { getSeenIps, getBlockedIps } from '@/lib/waf';

export async function GET() {
  return NextResponse.json({
    seen: getSeenIps(),
    blocked: getBlockedIps(),
  });
}
