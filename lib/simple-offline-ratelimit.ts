// lib/simple-offline-ratelimit.ts

// Har bir IP uchun so‘rov vaqtlarini saqlash
const requests: Map<string, number[]> = new Map();

/**
 * Oddiy offline rate limiting
 * @param ip - foydalanuvchi IP manzili
 * @param limit - maksimal so‘rovlar soni (default: 60)
 * @param windowMs - vaqt oynasi millisekundda (default: 60_000 = 1 daqiqa)
 * @returns success: boolean, retryAfter: soniyada kutish vaqti, remaining: qolgan limit
 */
export function offlineRateLimit(
  ip: string,
  limit: number = 60,
  windowMs: number = 60_000
): { success: boolean; retryAfter?: number; remaining?: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  // IP uchun so‘rovlar ro‘yxatini olish
  let userRequests: number[] = requests.get(ip) ?? [];

  // Eski so‘rovlarni filtrlash
  userRequests = userRequests.filter((time) => time > windowStart);

  // Limitdan oshib ketganmi?
  if (userRequests.length >= limit) {
    const retryAfter = Math.ceil((userRequests[0] + windowMs - now) / 1000);
    return { success: false, retryAfter };
  }

  // Yangi so‘rovni qo‘shish
  userRequests.push(now);
  requests.set(ip, userRequests);

  return { success: true, remaining: limit - userRequests.length };
}
