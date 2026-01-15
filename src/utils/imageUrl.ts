// If a movie row has cached_* URLs in Supabase Storage, pass them directly here.
// Callers should already choose cached over remote when available.
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Disallow data/blob URLs for Next/Image to avoid loader errors
  if (/^(data|blob):/i.test(trimmed)) return "";

  // Prefer Supabase Storage public URLs as-is
  // Matches: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/...
  if (/supabase\.co\/storage\/v1\/object\/public\//i.test(trimmed)) {
    return trimmed;
  }

  // Protocol-relative TMDB CDN (image or media host)
  if (/^\/\/(image|media)\.tmdb\.org/i.test(trimmed)) {
    return `https:${trimmed}`;
  }

  // Handle absolute URLs and rewrite certain hosts
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    const protocol = u.protocol.toLowerCase();

    // Rewrite themoviedb.org page image links and media.tmdb.org to image.tmdb.org CDN for /t/* paths
    if (((host === 'themoviedb.org' || host === 'www.themoviedb.org') && u.pathname.startsWith('/t/')) ||
        (host === 'media.themoviedb.org' && u.pathname.startsWith('/t/'))) {
      return `https://image.tmdb.org${u.pathname}`;
    }

    // Upgrade http to https for known allowed hosts
    const upgradeHosts = new Set([
      'image.tmdb.org', 'media.themoviedb.org',
      'assets.fanart.tv',
      'avatars.githubusercontent.com',
      'placehold.co',
    ]);
    if (protocol === 'http:' && upgradeHosts.has(host)) {
      return `https://${host}${u.pathname}${u.search}`;
    }

    // Otherwise return as-is
    return `${protocol}//${u.host}${u.pathname}${u.search}`;
  } catch {
    // Not an absolute URL
  }

  // Handle TMDB path-only inputs like /t/p/w500/...
  if (/^\/t\//.test(trimmed)) {
    return `https://image.tmdb.org${trimmed}`;
  }

  // Bare host without protocol for image.tmdb.org
  if (/^image\.tmdb\.org\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  // Reject invalid local paths (just "/" or malformed)
  const localPath = "/" + trimmed.replace(/^\/+/, "");
  if (localPath === "/" || localPath.length < 2) {
    return "";
  }

  // Ensure local paths start with a single leading slash
  return localPath;
}
