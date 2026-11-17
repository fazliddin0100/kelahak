type Bucket = { count: number; resetAt: number };

const MAX_KEYS_PER_SCOPE = 20_000;

const globalStore = globalThis as typeof globalThis & {
  __mezonRateLimit?: Map<string, Map<string, Bucket>>;
};

function scopeStore(scope: string): Map<string, Bucket> {
  const scopes = (globalStore.__mezonRateLimit ??= new Map());
  let store = scopes.get(scope);
  if (!store) {
    store = new Map();
    scopes.set(scope, store);
  }
  return store;
}

function prune(store: Map<string, Bucket>, now: number) {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
  // Still full of live buckets: drop the oldest ones so memory stays bounded.
  for (const key of store.keys()) {
    if (store.size <= MAX_KEYS_PER_SCOPE) break;
    store.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
};

/** Fixed-window in-memory limiter (one process; works in Node and Edge). */
export function consumeRateLimit(
  scope: string,
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const store = scopeStore(scope);
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (store.size >= MAX_KEYS_PER_SCOPE) prune(store, now);
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, count: 1, retryAfterSeconds: 0 };
  }

  bucket.count++;
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return {
    allowed: bucket.count <= limit,
    count: bucket.count,
    retryAfterSeconds,
  };
}

/** Reads the current window without counting a new hit. */
export function peekRateLimit(
  scope: string,
  key: string,
  limit: number
): RateLimitResult {
  const now = Date.now();
  const bucket = scopeStore(scope).get(key);
  if (!bucket || bucket.resetAt <= now) {
    return { allowed: true, count: 0, retryAfterSeconds: 0 };
  }
  return {
    allowed: bucket.count < limit,
    count: bucket.count,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function resetRateLimit(scope: string, key: string) {
  scopeStore(scope).delete(key);
}
