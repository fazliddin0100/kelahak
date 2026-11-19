import type { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/clientIp';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { logSecurityEvent } from '@/lib/securityLog';

/**
 * Admin va SuperAdmin amallari jurnali (security_logs, type = admin_action).
 * Kim (login), qaysi IP dan, nima qilgani yoziladi. Maxfiy ma'lumot (parol, kalit) yozilmaydi.
 * Jurnalga yozilmay qolsa ham asosiy amal to'xtamaydi.
 */
export async function logAdminAction(request: NextRequest, actorUserId: string, action: string): Promise<void> {
  try {
    await connectToDatabase();
    const actor = await prisma.auth.findUnique({ where: { userId: actorUserId }, select: { login: true } });
    await logSecurityEvent({
      type: 'admin_action',
      ip: getClientIp(request.headers),
      path: new URL(request.url).pathname,
      method: request.method,
      loginHint: actor?.login ?? actorUserId,
      message: action.slice(0, 500),
      statusCode: 200,
    });
  } catch (e) {
    console.error('Admin amali jurnalga yozilmadi:', e);
  }
}

/** Jurnal uchun user nomi: login (bo'lmasa ID). */
export async function loginOf(userId: string): Promise<string> {
  const row = await prisma.auth.findUnique({ where: { userId }, select: { login: true } });
  return row?.login ?? userId;
}
