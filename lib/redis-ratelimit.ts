import { redis } from './redis';

export async function rateLimiter(userId: string, role: string) {
  // Rollarga qarab limitlarni belgilash
  const limits: Record<string, { count: number; window: number }> = {
    admin: { count: 500, window: 60 }, // 1 minutda 500 so'rov
    superAdmin: { count: 1000, window: 60 },
    user: { count: 50, window: 60 }, // 1 minutda 50 so'rov
    default: { count: 20, window: 60 },
  };

  const limit = limits[role] || limits.default;
  const key = `rate_limit:${userId}`;

  // Redis-da so'rovlar sonini oshirish
  const currentRequests = await redis.incr(key);

  if (currentRequests === 1) {
    // Birinchi so'rovda vaqt chegarasini o'rnatish
    await redis.expire(key, limit.window);
  }

  if (currentRequests > limit.count) {
    return { success: false, limit: limit.count };
  }

  return { success: true, limit: limit.count };
}
