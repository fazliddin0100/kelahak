import connectToDatabase, { prisma } from '@/lib/prisma';
import type { SecurityEventType } from '@prisma/client';

export type { SecurityEventType };

export type SecurityLogEntry = {
  _id?: string;
  type: SecurityEventType;
  ip: string;
  path: string;
  method: string;
  userAgent?: string;
  loginHint?: string;
  message?: string;
  statusCode?: number;
  createdAt: string;
};

const MAX_MEMORY = 3000;
const memoryLogs: SecurityLogEntry[] = [];

export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

function pushMemory(
  entry: Omit<SecurityLogEntry, '_id' | 'createdAt'> & { createdAt?: string }
) {
  const row: SecurityLogEntry = {
    ...entry,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
  memoryLogs.unshift(row);
  if (memoryLogs.length > MAX_MEMORY) memoryLogs.length = MAX_MEMORY;
}

function newLogId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

export async function logSecurityEvent(
  entry: Omit<SecurityLogEntry, '_id' | 'createdAt'> & { createdAt?: string }
) {
  pushMemory(entry);
  try {
    await connectToDatabase();
    await prisma.securityLog.create({
      data: {
        id: newLogId(),
        type: entry.type,
        ip: entry.ip,
        path: entry.path,
        method: entry.method,
        userAgent: entry.userAgent?.slice(0, 500),
        loginHint: entry.loginHint,
        message: entry.message,
        statusCode: entry.statusCode,
      },
    });
  } catch (e) {
    console.error('SecurityLog yozishda xato:', e);
  }
}

export function getMemoryLogs(limit = 500): SecurityLogEntry[] {
  return memoryLogs.slice(0, limit);
}

export async function getSecurityLogsFromDb(
  limit = 500,
  type?: SecurityEventType
) {
  await connectToDatabase();
  const docs = await prisma.securityLog.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return docs.map((d) => ({
    _id: d.id,
    type: d.type,
    ip: d.ip,
    path: d.path,
    method: d.method,
    userAgent: d.userAgent ?? undefined,
    loginHint: d.loginHint ?? undefined,
    message: d.message ?? undefined,
    statusCode: d.statusCode ?? undefined,
    createdAt: d.createdAt.toISOString(),
  }));
}

export async function getMergedSecurityLogs(
  limit = 300,
  type?: SecurityEventType
) {
  const memAll = getMemoryLogs(limit * 3);
  const mem = type ? memAll.filter((l) => l.type === type) : memAll;

  const [db] = await Promise.all([getSecurityLogsFromDb(limit, type)]);

  const seen = new Set<string>();
  const merged: SecurityLogEntry[] = [];
  for (const row of [...mem, ...db]) {
    const key = `${row.createdAt}-${row.ip}-${row.path}-${row.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return merged.slice(0, limit);
}

export async function getSecurityStats(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  await connectToDatabase();
  const logs = await prisma.securityLog.findMany({
    where: { createdAt: { gte: since } },
    select: { type: true, ip: true, path: true },
  });

  const memRecent = memoryLogs.filter(
    (l) => new Date(l.createdAt) >= since
  );

  const all = [
    ...memRecent,
    ...logs.map((d) => ({
      type: d.type,
      ip: d.ip,
      path: d.path,
    })),
  ];

  const byType: Record<string, number> = {};
  const byIp: Record<string, number> = {};
  const byPath: Record<string, number> = {};

  for (const row of all) {
    byType[row.type] = (byType[row.type] ?? 0) + 1;
    byIp[row.ip] = (byIp[row.ip] ?? 0) + 1;
    byPath[row.path] = (byPath[row.path] ?? 0) + 1;
  }

  const topPaths = Object.entries(byPath)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, count]) => ({ path, count }));

  const topIps = Object.entries(byIp)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([ip, count]) => ({ ip, count }));

  return {
    hours,
    total: all.length,
    loginFailed: byType.login_failed ?? 0,
    rateLimit: byType.rate_limit ?? 0,
    suspicious: byType.suspicious ?? 0,
    ddos: byType.ddos ?? 0,
    visits: byType.visit ?? 0,
    wafBlock: byType.waf_block ?? 0,
    byType,
    topPaths,
    topIps,
  };
}

export function verifySecurityLogKey(request: Request): boolean {
  const key = process.env.SECURITY_LOG_KEY?.trim();
  if (!key) return process.env.NODE_ENV === 'development';
  return request.headers.get('x-security-log-key') === key;
}
