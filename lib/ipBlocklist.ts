import connectToDatabase, { prisma } from '@/lib/prisma';

const memoryBlocked = new Set<string>();
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 4_000;

export async function refreshBlockedIpCache(): Promise<string[]> {
  await connectToDatabase();
  const docs = await prisma.blockedIp.findMany({
    where: { active: true },
    select: { ip: true },
  });
  memoryBlocked.clear();
  for (const d of docs) {
    memoryBlocked.add(d.ip);
  }
  cacheLoadedAt = Date.now();
  return Array.from(memoryBlocked);
}

export async function getBlockedIpList(): Promise<string[]> {
  if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
    await refreshBlockedIpCache();
  }
  return Array.from(memoryBlocked);
}

export function isIpBlocked(ip: string): boolean {
  return memoryBlocked.has(ip);
}

export async function blockIpPersistent(
  ip: string,
  meta?: { reason?: string; blockedBy?: string; source?: string }
) {
  const clean = ip.trim();
  if (!clean) return;

  await connectToDatabase();
  await prisma.blockedIp.upsert({
    where: { ip: clean },
    create: {
      id: crypto.randomUUID().replace(/-/g, '').slice(0, 24),
      ip: clean,
      reason: meta?.reason ?? '',
      blockedBy: meta?.blockedBy ?? '',
      source: meta?.source ?? 'manual',
      active: true,
    },
    update: {
      reason: meta?.reason ?? '',
      blockedBy: meta?.blockedBy ?? '',
      source: meta?.source ?? 'manual',
      active: true,
    },
  });
  memoryBlocked.add(clean);
  cacheLoadedAt = Date.now();
}

export async function unblockIpPersistent(ip: string) {
  const clean = ip.trim();
  await connectToDatabase();
  await prisma.blockedIp.updateMany({
    where: { ip: clean },
    data: { active: false },
  });
  memoryBlocked.delete(clean);
  cacheLoadedAt = Date.now();
}

export function verifyWafSyncKey(request: Request): boolean {
  const key =
    process.env.WAF_SYNC_KEY?.trim() ||
    process.env.SECURITY_LOG_KEY?.trim() ||
    '';
  if (!key) return process.env.NODE_ENV === 'development';
  return request.headers.get('x-waf-sync-key') === key;
}
