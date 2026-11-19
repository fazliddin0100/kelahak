// E-IMZO bosqichi: parol to'g'ri kiritilgach berilgan challenge'ni foydalanuvchi
// fleshkadagi kaliti bilan imzolaydi. Server imzo va sertifikatni tekshirib sessiya beradi.
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/clientIp';
import { findUserById } from '@/lib/db/user';
import {
  challengeMessage,
  clearPendingCookie,
  consumeChallenge,
  isAllowedOrigin,
  PENDING_COOKIE,
  type EimzoLoginKind,
} from '@/lib/eimzo/challenge';
import { EimzoError, parseAndValidateCertificate, verifyEimzoSignature } from '@/lib/eimzo/verify';
import { logLoginDenied, logLoginSuccess } from '@/lib/loginFlow';
import { issueLoginSession } from '@/lib/loginSession';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { consumeRateLimit } from '@/lib/rateLimit';
import { canLoginWithoutApproval } from '@/lib/userAccess';

const PATH = '/api/auth/eimzo/verify';
const ATTEMPTS_PER_IP = process.env.NODE_ENV === 'development' ? 200 : 30;
const KINDS: readonly EimzoLoginKind[] = ['access', 'admin', 'superadmin'];

function deny(status: number, message: string, code: string) {
  return clearPendingCookie(NextResponse.json({ message, code }, { status }));
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = consumeRateLimit('eimzo-verify-ip', ip, ATTEMPTS_PER_IP, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: 'Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.', code: 'RATE_LIMIT' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const challengeId = typeof body?.challengeId === 'string' ? body.challengeId : '';
  const pendingId = request.cookies.get(PENDING_COOKIE)?.value ?? '';

  // Challenge shu brauzerda parol bilan boshlangan bo'lishi kerak
  if (!challengeId || challengeId !== pendingId) {
    return deny(400, 'Kirish sessiyasi topilmadi. Login va parolni qayta kiriting.', 'NO_CHALLENGE');
  }
  if (!isAllowedOrigin(request, body?.origin)) {
    return deny(400, 'So‘rov manbasi tasdiqlanmadi.', 'BAD_ORIGIN');
  }

  try {
    await connectToDatabase();
    const challenge = await consumeChallenge(challengeId);
    if (!challenge || !KINDS.includes(challenge.kind as EimzoLoginKind)) {
      return deny(400, 'Kirish so‘rovi muddati tugagan yoki ishlatilgan. Qayta kiring.', 'CHALLENGE_EXPIRED');
    }

    const user = await findUserById(challenge.userId);
    const login = user?.auth?.login ?? '';
    if (!user?.job?.role) {
      return deny(401, 'Foydalanuvchi topilmadi.', 'USER_NOT_FOUND');
    }

    let parsed;
    try {
      parsed = parseAndValidateCertificate(body?.certPem);
      verifyEimzoSignature(
        parsed.cert,
        challengeMessage(challenge.id, challenge.nonce, body!.origin as string),
        body?.signature
      );
    } catch (e) {
      if (e instanceof EimzoError) {
        logLoginDenied(ip, PATH, login, `E-IMZO: ${e.code}`);
        const status = e.code === 'CA_MISSING' ? 503 : 401;
        return deny(status, e.message, e.code);
      }
      throw e;
    }

    const stored = await prisma.userCertificate.findUnique({
      where: { fingerprint256: parsed.fingerprint256 },
    });
    if (!stored || stored.userId !== user.id) {
      logLoginDenied(ip, PATH, login, 'E-IMZO: sertifikat userga biriktirilmagan');
      return deny(401, 'Bu sertifikat sizning hisobingizga biriktirilmagan.', 'NOT_BOUND');
    }
    if (stored.status !== 'active') {
      logLoginDenied(ip, PATH, login, 'E-IMZO: bekor qilingan sertifikat');
      return deny(401, 'Sertifikat bekor qilingan. Administratorga murojaat qiling.', 'REVOKED');
    }

    // Parol va E-IMZO orasida ruxsat olib qo'yilgan bo'lishi mumkin
    if (!canLoginWithoutApproval(user.job.role.role, Boolean(user.job.isUserTrue))) {
      return deny(403, 'Sizga tizimga kirish uchun hozircha ruxsat berilmagan', 'PENDING_APPROVAL');
    }

    logLoginSuccess(ip, PATH, login);
    const response = await issueLoginSession(challenge.kind as EimzoLoginKind, {
      id: user.id,
      job: { department: user.job.department, role: { role: user.job.role.role } },
    });
    return clearPendingCookie(response);
  } catch (error) {
    console.error('E-IMZO tekshiruv xatosi:', error);
    return deny(500, 'Tizimga kirishda xatolik', 'SERVER_ERROR');
  }
}
