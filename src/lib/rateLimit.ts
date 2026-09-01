/**
 * Minimal fixed-window rate limiter for route handlers.
 *
 * Exists because `/api/movies/import-live` had to open to unauthenticated
 * callers: a logged-out guest picking a film outside the ~4,400-row library
 * got a 401, which made the first step of onboarding a dead end (the search
 * dropdown offered TMDB rows it could never deliver). That 401 was the only
 * thing standing between anonymous traffic and a `supabaseAdmin` write, so the
 * limit below is load-bearing rather than decorative.
 *
 * **In-memory and per-instance.** This is deliberately not Redis — there's no
 * shared store in the stack today. On Netlify each function instance keeps its
 * own map, so the effective ceiling is `limit × live instances`, and a cold
 * start resets a caller's budget. That is a real weakness: treat this as
 * protection against casual abuse and runaway clients, not as a defence against
 * a determined distributed attacker. If this endpoint ever becomes a target,
 * the fix is a shared store, not a lower number here.
 */

interface Bucket {
  count: number;
  /** Epoch ms when this bucket's window ends and the count resets. */
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Ceiling on tracked keys, so a spray of unique IPs can't grow the map without
 * bound. Expired entries are swept first; a clear is the last resort, and it
 * only costs everyone one extra window of budget.
 */
const MAX_TRACKED_KEYS = 5000;

export interface RateLimitResult {
  allowed: boolean;
  /** Requests left in the current window. 0 when `allowed` is false. */
  remaining: number;
  /** Seconds until the window resets. 0 when `allowed` is true. */
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
      if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/**
 * Best-effort client IP.
 *
 * `x-nf-client-connection-ip` is Netlify's own header and is the trustworthy
 * one in this deployment; `x-forwarded-for` is a client-settable fallback for
 * local dev and any other host, so it is not authoritative.
 *
 * Unknown callers share a single bucket rather than bypassing the limit. That
 * can throttle unrelated traffic together, which is the safer failure: the
 * alternative is an unlimited hole for anyone who can strip headers.
 */
export function clientIpFrom(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (
    req.headers.get("x-nf-client-connection-ip") ??
    (forwarded ? forwarded.split(",")[0]!.trim() : null) ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
