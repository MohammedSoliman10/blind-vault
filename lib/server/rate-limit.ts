/**
 * In-Memory Sliding Window Rate Limiter
 * Enforces per-IP request limits (Default: 10 requests per minute).
 */

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  ip: string,
  limit: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = store.get(ip);
  if (!record) {
    record = { timestamps: [] };
    store.set(ip, record);
  }

  // Purge expired timestamps
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetIn = Math.max(0, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetIn,
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  return {
    allowed: true,
    remaining,
    resetIn: Math.ceil(windowMs / 1000),
  };
}

/**
 * Resets the in-memory store (used for test isolation).
 */
export function resetRateLimitStore(): void {
  store.clear();
}
