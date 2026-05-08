import "server-only";

/**
 * Tiny in-memory cache shared across request handlers in the same Node
 * instance. On Vercel, each warm function instance keeps its own copy.
 * Safe for idempotent content reads; do NOT use for per-learner data.
 */

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();

export async function memoCache<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = store.get(key) as Entry<T> | undefined;
  if (existing && existing.expires > now) return existing.value;

  const value = await compute();
  store.set(key, { value, expires: now + ttlSeconds * 1000 });
  return value;
}

/** Standard Cache-Control header for public content endpoints. */
export const CONTENT_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
};
