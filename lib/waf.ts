// lib/waf.ts (Edge Runtime safe)
type WafDecision = {
  allowed: boolean;
  reason?: string;
  score?: number;
  matchedRules?: string[];
  retryAfterSeconds?: number;
};

const blockedIps = new Set<string>();
const allowedIps = new Set<string>();
const seenIps = new Set<string>();
const ipViolations = new Map<string, number>();
const ipLastViolation = new Map<string, number>();

const MAX_BODY_BYTES = 1_000_000;
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
const ALLOWED_CONTENT_TYPES = new Set([
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
]);

// OWASP signatures (regex)
const signatures = {
  xss: [/script/i, /on\w+=/i, /javascript:/i],
  sqli: [/union select/i, /drop table/i, /or 1=1/i],
  traversal: [/(\.\.\/)+/i],
};

const CATEGORY_SCORE = { xss: 3, sqli: 4, traversal: 3 };
const BLOCK_THRESHOLD = 6;
const AUTO_BLOCK_AFTER = 3;
const COOLDOWN_MS = 15 * 60_000;

export function wafCheck(params: {
  ip: string;
  method?: string;
  contentType?: string | null;
  path?: string;
  headers?: Record<string, string>;
  bodyBytes?: number;
  samplePayload?: unknown;
}): WafDecision {
  const ip = params.ip || '127.0.0.1';
  const method = params.method || 'GET';
  const contentType = (params.contentType || '').toLowerCase();
  const pathStr = params.path || '/';
  const payloadLower = JSON.stringify(params.samplePayload || '').toLowerCase();

  seenIps.add(ip);

  if (allowedIps.has(ip)) return { allowed: true, reason: 'allowlist' };
  if (blockedIps.has(ip)) return { allowed: false, reason: 'blocklist' };

  if (!ALLOWED_METHODS.has(method))
    return { allowed: false, reason: 'method-not-allowed' };
  if (
    contentType &&
    !Array.from(ALLOWED_CONTENT_TYPES).some((t) => contentType.startsWith(t))
  )
    return { allowed: false, reason: 'content-type-not-allowed' };
  if ((params.bodyBytes || 0) > MAX_BODY_BYTES)
    return { allowed: false, reason: 'body-size-exceeded' };

  let score = 0;
  const matchedRules: string[] = [];
  const targets = [payloadLower, pathStr.toLowerCase()];

  for (const re of signatures.xss)
    if (targets.some((t) => re.test(t))) {
      score += CATEGORY_SCORE.xss;
      matchedRules.push('xss');
    }
  for (const re of signatures.sqli)
    if (targets.some((t) => re.test(t))) {
      score += CATEGORY_SCORE.sqli;
      matchedRules.push('sqli');
    }
  for (const re of signatures.traversal)
    if (targets.some((t) => re.test(t))) {
      score += CATEGORY_SCORE.traversal;
      matchedRules.push('traversal');
    }

  if (score >= BLOCK_THRESHOLD) {
    const violations = (ipViolations.get(ip) || 0) + 1;
    ipViolations.set(ip, violations);
    ipLastViolation.set(ip, Date.now());
    if (violations >= AUTO_BLOCK_AFTER) blockedIps.add(ip);
    return {
      allowed: false,
      reason: 'anomaly-score',
      score,
      matchedRules,
      retryAfterSeconds: 900,
    };
  }

  const last = ipLastViolation.get(ip);
  if (last && Date.now() - last > COOLDOWN_MS) {
    ipViolations.set(ip, 0);
    ipLastViolation.delete(ip);
  }

  return { allowed: true, score, matchedRules };
}

export function getSeenIps(): string[] {
  return Array.from(seenIps);
}
export function getBlockedIps(): string[] {
  return Array.from(blockedIps);
}
export function blockIp(ip: string) {
  blockedIps.add(ip);
}
export function unblockIp(ip: string) {
  blockedIps.delete(ip);
}
