import {
  logSecurityEvent,
  SECURITY_EVENT_TYPES,
  verifySecurityLogKey,
} from '@/lib/securityLog';
import type { SecurityEventType } from '@/lib/securityLog';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (!(await verifySecurityLogKey(request))) {
    return NextResponse.json({ message: 'Ruxsat yo‘q' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const type = body.type as SecurityEventType;
    if (!SECURITY_EVENT_TYPES.includes(type) || !body.ip || !body.path) {
      return NextResponse.json({ message: 'type, ip, path kerak' }, { status: 400 });
    }

    const statusCode = Number(body.statusCode);

    await logSecurityEvent({
      type,
      ip: String(body.ip),
      path: String(body.path),
      method: String(body.method ?? 'GET'),
      userAgent: body.userAgent ? String(body.userAgent) : undefined,
      loginHint: body.loginHint ? String(body.loginHint) : undefined,
      message: body.message ? String(body.message) : undefined,
      statusCode:
        Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599 ?
          statusCode
        : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
