import { randomBytes, randomUUID } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { NextResponse as Response } from 'next/server';
import connectToDatabase, { prisma } from '@/lib/prisma';

/** Kirishning qaysi turi uchun challenge berilgan (sessiya turi shunga qarab beriladi). */
export type EimzoLoginKind = 'access' | 'admin' | 'superadmin';

export const CHALLENGE_TTL_MS = 2 * 60 * 1000;
export const PENDING_COOKIE = 'eimzo_pending';
const PENDING_COOKIE_PATH = '/api/auth/eimzo';

let lastCleanupAt = 0;

/**
 * Userga biror marta sertifikat biriktirilgan bo'lsa (yoki EIMZO_REQUIRED=true) parol yetarli emas.
 * Bekor qilingan sertifikatlar ham hisoblanadi: aks holda sertifikatni bekor qilish
 * userni yana faqat parol bilan kirishga qaytarib qo'yardi.
 */
export async function isEimzoRequired(userId: string): Promise<boolean> {
  if (process.env.EIMZO_REQUIRED === 'true') return true;
  await connectToDatabase();
  const bound = await prisma.userCertificate.count({ where: { userId } });
  return bound > 0;
}

/** Imzolanadigan matn. Origin kiritilgani uchun boshqa saytda olingan imzo bu yerda o'tmaydi. */
export function challengeMessage(challengeId: string, nonce: string, origin: string): string {
  return `mezon-login|${challengeId}|${nonce}|${origin}`;
}

/** Brauzer imzolagan origin shu serverniki ekanini tekshiradi (APP_ORIGIN yoki Host). */
export function isAllowedOrigin(request: NextRequest, origin: unknown): origin is string {
  if (typeof origin !== 'string' || origin.length > 200) return false;
  const allowed = (process.env.APP_ORIGIN ?? '')
    .split(',')
    .map((v) => v.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (allowed.length > 0) return allowed.includes(origin);
  try {
    const host = new URL(origin).host;
    return [request.headers.get('host'), request.headers.get('x-forwarded-host')].includes(host);
  } catch {
    return false;
  }
}

/** Parol to'g'ri bo'lgach chaqiriladi: sessiya o'rniga E-IMZO bosqichini boshlaydi. */
export async function startEimzoChallenge(userId: string, kind: EimzoLoginKind): Promise<NextResponse> {
  await connectToDatabase();
  const now = Date.now();
  if (now - lastCleanupAt > 10 * 60 * 1000) {
    lastCleanupAt = now;
    await prisma.loginChallenge.deleteMany({ where: { expiresAt: { lt: new Date(now - 60 * 60 * 1000) } } });
  }

  const id = randomUUID();
  const nonce = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now + CHALLENGE_TTL_MS);
  await prisma.loginChallenge.create({ data: { id, userId, nonce, kind, expiresAt } });

  const response = Response.json(
    { step: 'eimzo', challengeId: id, nonce, expiresAt: expiresAt.toISOString() },
    { status: 200 }
  );
  response.cookies.set(PENDING_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: PENDING_COOKIE_PATH,
    maxAge: CHALLENGE_TTL_MS / 1000,
  });
  return response;
}

export function clearPendingCookie(response: NextResponse): NextResponse {
  response.cookies.set(PENDING_COOKIE, '', { path: PENDING_COOKIE_PATH, maxAge: 0 });
  return response;
}

/**
 * Challenge'ni atomar ravishda "ishlatilgan" deb belgilaydi.
 * Muddati o'tgan yoki allaqachon ishlatilgan bo'lsa null qaytaradi.
 */
export async function consumeChallenge(id: string) {
  await connectToDatabase();
  const now = new Date();
  const updated = await prisma.loginChallenge.updateMany({
    where: { id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (updated.count !== 1) return null;
  return prisma.loginChallenge.findUnique({ where: { id } });
}
