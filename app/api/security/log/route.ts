import { logSecurityEvent, verifySecurityLogKey } from '@/lib/securityLog';
import type { SecurityEventType } from '@/lib/securityLog';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (!verifySecurityLogKey(request)) {
    return NextResponse.json({ message: 'Ruxsat yo‘q' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const type = body.type as SecurityEventType;
    if (!type || !body.ip || !body.path) {
      return NextResponse.json({ message: 'type, ip, path kerak' }, { status: 400 });
    }

    await logSecurityEvent({
      type,
      ip: String(body.ip),
      path: String(body.path),
      method: String(body.method ?? 'GET'),
      userAgent: body.userAgent ? String(body.userAgent) : undefined,
      loginHint: body.loginHint ? String(body.loginHint) : undefined,
      message: body.message ? String(body.message) : undefined,
      statusCode: body.statusCode ? Number(body.statusCode) : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
