/**
 * siteUrl — the absolute public origin used to build canonical URLs in
 * src/app/sitemap.ts and src/app/robots.ts.
 *
 * NOT the same thing as `getSiteUrl`/`buildSiteUrl` in src/utils/siteUrl.ts,
 * and deliberately not merged with it: that one falls back to
 * `window.location.origin` and then to an empty string, which is right for
 * auth redirects (they resolve in the browser, where the current origin IS
 * the correct answer) and useless here. sitemap.ts and robots.ts render on
 * the server at build time, where there is no window and a relative or empty
 * origin produces an invalid sitemap.
 *
 * Both routes are prerendered as STATIC content, so whatever this resolves to
 * during `next build` is frozen into the deployed sitemap.xml and robots.txt.
 * There is no runtime correction. A build that picks up a dev value for
 * NEXT_PUBLIC_SITE_URL ships thousands of localhost URLs and a robots.txt
 * pointing at localhost — a perfectly well-formed pair of files that search
 * engines parse and then discard, with no error anywhere. That failure is
 * invisible until months of absent traffic make it obvious, which is why the
 * guard below turns it into a loud build failure instead.
 */
const DEFAULT_SITE_URL = 'https://reawarding.com';

const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const siteUrl = (configured || DEFAULT_SITE_URL).replace(/\/$/, '');

// A deploy is the only context where a dev origin is unambiguously wrong, so
// it's the only context that throws. Netlify sets NETLIFY=true in every build;
// it is not a NEXT_PUBLIC_* variable, so it is undefined in client bundles and
// this can never throw in a browser. Local `next build` runs still warn, which
// is what you want when checking a production build by hand with a dev .env.
const isDeployBuild = Boolean(process.env.NETLIFY);

const isNonPublicOrigin =
  siteUrl.startsWith('http://') ||
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/i.test(siteUrl);

if (isNonPublicOrigin) {
  const detail =
    `siteUrl resolved to "${siteUrl}", which is not a public https origin. ` +
    `sitemap.xml and robots.txt are prerendered as static content, so this value ` +
    `is baked into the deployed files and cannot be corrected at runtime. ` +
    `Set NEXT_PUBLIC_SITE_URL to the production origin (e.g. ${DEFAULT_SITE_URL}) ` +
    `in the deploy environment, or unset it there to fall back to that default.`;

  if (isDeployBuild) {
    throw new Error(`[siteUrl] Refusing to build a deploy with a non-public origin. ${detail}`);
  }

  console.warn(`[siteUrl] ${detail}`);
}
