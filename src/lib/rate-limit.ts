/**
 * Simple in-memory rate limiter for serverless API routes.
 * Keyed by an arbitrary identity string — callers compose it from learnerId
 * when available, falling back to IP for routes without a learner context.
 * Resets on cold start (acceptable for serverless).
 */

const windowMs = 60 * 1000; // 1-minute rolling window
const defaultMax = 10;       // per-key max requests per window

const hits = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * @param key Composite identity, e.g. "learner:uuid", "ip:1.2.3.4", "login:1.2.3.4".
 * @param max Optional override (default 10/min). Use smaller for expensive routes,
 *            larger for cheap telemetry endpoints.
 */
export function rateLimit(key: string, max = defaultMax): RateLimitResult {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetInSeconds: Math.ceil(windowMs / 1000) };
  }

  entry.count++;
  const resetInSeconds = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
  if (entry.count > max) {
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  return { allowed: true, remaining: max - entry.count, resetInSeconds };
}

/** Get client IP from Next.js request headers. */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Compose a rate-limit key. Prefers learnerId (so one noisy device is isolated),
 * falls back to IP (so unauthenticated spam is still capped).
 */
export function rateLimitKey(
  headers: Headers,
  learnerId?: string | null,
  scope = 'api'
): string {
  if (learnerId && typeof learnerId === 'string' && learnerId.length > 0) {
    return `${scope}:learner:${learnerId}`;
  }
  return `${scope}:ip:${getClientIp(headers)}`;
}
