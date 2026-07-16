import {
  getBlockedIpList,
  refreshBlockedIpCache,
  verifyWafSyncKey,
} from '@/lib/ipBlocklist';
import { getBlockedIps } from '@/lib/waf';
import { NextRequest, NextResponse } from 'next/server';

/** Middleware sync — JWT talab qilinmaydi, maxfiy kalit bilan */
export async function GET(request: NextRequest) {
  if (!verifyWafSyncKey(request)) {
    return NextResponse.json({ message: 'Ruxsat yo‘q' }, { status: 403 });
  }

  try {
    const blocked = await getBlockedIpList();
    const wafMem = getBlockedIps();
    const merged = Array.from(new Set([...blocked, ...wafMem]));
    return NextResponse.json({ blocked: merged });
  } catch {
    try {
      await refreshBlockedIpCache();
      return NextResponse.json({ blocked: await getBlockedIpList() });
    } catch {
      return NextResponse.json({ blocked: [] });
    }
  }
}
