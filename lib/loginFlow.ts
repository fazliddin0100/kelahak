import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import validator from 'validator';

import { getClientIp } from '@/lib/clientIp';
import { findUserByLogin } from '@/lib/db/user';
import {
  BCRYPT_COST,
  hashPassword,
  passwordHashNeedsUpgrade,
} from '@/lib/passwordPolicy';
import { prisma } from '@/lib/prisma';
import {
  consumeRateLimit,
  peekRateLimit,
  resetRateLimit,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/securityLog';

const WINDOW_MS = 15 * 60 * 1000;
const IS_DEV = process.env.NODE_ENV === 'development';
/** Muvaffaqiyatsiz urinishlar chegarasi (to‘g‘ri kirishlar hisoblanmaydi) */
const FAILURES_PER_LOGIN = IS_DEV ? 100 : 10;
const FAILURES_PER_IP = IS_DEV ? 500 : 50;

const INVALID_CREDENTIALS = 'Noto‘g‘ri login yoki parol';

let dummyHash: Promise<string> | undefined;

/** Login mavjud bo‘lmaganda ham bir xil vaqt sarflanadi (login bor-yo‘qligi sezilmasin) */
function compareAgainstDummy(password: string): Promise<boolean> {
  dummyHash ??= bcrypt.hash('mezon-timing-equalizer', BCRYPT_COST);
  return dummyHash.then((hash) => bcrypt.compare(password, hash));
}

type AuthRecord = NonNullable<Awaited<ReturnType<typeof findUserByLogin>>>;

export type VerifiedLogin =
  | { ok: true; authRecord: AuthRecord; ip: string; login: string }
  | { ok: false; response: NextResponse };

function fail(message: string, status: number, headers?: HeadersInit) {
  return {
    ok: false as const,
    response: NextResponse.json({ message }, { status, headers }),
  };
}

/** Login + parolni tekshiradi, brute-force cheklovi va xavfsizlik logini yuritadi. */
export async function verifyLoginRequest(
  request: NextRequest,
  path: string
): Promise<VerifiedLogin> {
  const ip = getClientIp(request.headers);

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const rawLogin = typeof body?.login === 'string' ? body.login : '';
  const rawPassword = typeof body?.password === 'string' ? body.password : '';

  if (!rawLogin || !rawPassword) {
    return fail('Login va parol kerak', 400);
  }

  const login = validator.trim(rawLogin).toLowerCase();
  const password = validator.trim(rawPassword);

  if (
    !validator.isLength(login, { min: 3, max: 50 }) ||
    !validator.isAlphanumeric(login, 'en-US', { ignore: '_-' }) ||
    password.length > 256
  ) {
    return fail(INVALID_CREDENTIALS, 401);
  }

  const loginState = peekRateLimit('login-fail-account', login, FAILURES_PER_LOGIN);
  const ipState = peekRateLimit('login-fail-ip', ip, FAILURES_PER_IP);
  if (!loginState.allowed || !ipState.allowed) {
    const retryAfter = Math.max(
      loginState.allowed ? 0 : loginState.retryAfterSeconds,
      ipState.allowed ? 0 : ipState.retryAfterSeconds
    );
    void logSecurityEvent({
      type: 'rate_limit',
      ip,
      path,
      method: 'POST',
      loginHint: login,
      message: 'Login urinishlari chegarasi',
      statusCode: 429,
    });
    return fail(`Juda ko‘p urinish. Iltimos ${retryAfter}s kuting`, 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const authRecord = await findUserByLogin(login);
  const passwordMatches =
    authRecord ?
      await bcrypt.compare(password, authRecord.password)
    : await compareAgainstDummy(password).then(() => false);

  if (!authRecord || !passwordMatches) {
    consumeRateLimit('login-fail-account', login, FAILURES_PER_LOGIN, WINDOW_MS);
    consumeRateLimit('login-fail-ip', ip, FAILURES_PER_IP, WINDOW_MS);
    void logSecurityEvent({
      type: 'login_failed',
      ip,
      path,
      method: 'POST',
      loginHint: login,
      message: 'Login yoki parol noto‘g‘ri',
      statusCode: 401,
    });
    return fail(INVALID_CREDENTIALS, 401);
  }

  resetRateLimit('login-fail-account', login);

  if (passwordHashNeedsUpgrade(authRecord.password)) {
    try {
      await prisma.auth.update({
        where: { id: authRecord.id },
        data: { password: await hashPassword(password) },
      });
    } catch (error) {
      console.error('Parol xeshini yangilashda xato:', error);
    }
  }

  return { ok: true, authRecord, ip, login };
}

export function logLoginSuccess(ip: string, path: string, login: string) {
  void logSecurityEvent({
    type: 'login_success',
    ip,
    path,
    method: 'POST',
    loginHint: login,
    statusCode: 200,
  });
}

export function logLoginDenied(
  ip: string,
  path: string,
  login: string,
  message: string
) {
  void logSecurityEvent({
    type: 'login_failed',
    ip,
    path,
    method: 'POST',
    loginHint: login,
    message,
    statusCode: 403,
  });
}
