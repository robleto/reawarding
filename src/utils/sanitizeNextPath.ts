/**
 * Sanitize a client-supplied `next` redirect target to a same-origin relative
 * path. `next` is threaded through the login flow (middleware -> /login ->
 * signInWithPassword / OAuth / email confirmation -> /auth/callback or
 * /auth/confirm) so a returning user lands back where they started instead of
 * being dumped on the homepage.
 *
 * It must never be trusted directly as a redirect target. A naive
 * `startsWith('/') && !startsWith('//')` check is NOT sufficient: a value like
 * `/\evil.com` also starts with a single `/`, but the WHATWG URL parser
 * treats a backslash as a path separator for special schemes, so
 * `new URL('/\\evil.com', 'https://reawarding.com').href` resolves to
 * `https://evil.com/` — an off-site redirect that slips past a substring
 * check. Instead, resolve `raw` against a placeholder origin with the same
 * URL parser the browser/Node will eventually use, and only accept it if the
 * resolved origin is still the placeholder — i.e. nothing in `raw` was able
 * to change the host/scheme, by whatever parsing quirk.
 */
export function sanitizeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  const PLACEHOLDER_ORIGIN = 'https://reawarding-sanitize.invalid';
  try {
    const resolved = new URL(raw, PLACEHOLDER_ORIGIN);
    if (resolved.origin !== PLACEHOLDER_ORIGIN) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
