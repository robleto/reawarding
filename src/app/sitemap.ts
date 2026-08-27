import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { siteUrl } from '@/lib/siteUrl';
import { movieSlug } from '@/utils/slug';

/**
 * Regenerate at most once a day (ISR: the first request after expiry serves
 * the cached copy and rebuilds in the background, so no visitor ever waits on
 * the ~5 paged queries below).
 *
 * Without this the sitemap is frozen at build time, and films added after a
 * deploy stay undiscoverable until the next one. Daily rather than hourly
 * because the consumer is a crawler: search engines refetch sitemap.xml on
 * their own schedule, roughly daily at best, so a shorter window would spend
 * DB reads regenerating a file nobody has asked for yet.
 *
 * This does NOT remove the build-time dependency — the route still prerenders
 * once during `next build`, so the Netlify build environment still needs
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
export const revalidate = 86400;

const STATIC_ROUTES = [
  '',
  '/films',
  '/films/collections',
  '/films/collections/readiness',
  '/guides',
  '/guides/letterboxd-for-rewriting-the-oscars',
  '/guides/reawarding-vs-letterboxd',
  '/help',
  '/help/add-movie',
  '/help/guest-mode',
  '/help/refresh-metadata',
  '/legal/privacy',
  '/legal/terms',
  '/legal/data-deletion',
  '/leaderboard',
  '/members',
  '/premium',
];

// Playwright/Puppeteer/manual test accounts leak into the profiles table
// (pptest*, ppstr*, playwright+*, testuser_*, tester*, test-*, email-as-username, etc.)
// Keep these out of the sitemap until profiles get a real is_test/public flag.
const TEST_USERNAME_PATTERN = /^(pptest|ppstr|playwright|testuser|tester|test-|debug-)|_test$|@/i;

function isTestUsername(username: string) {
  return TEST_USERNAME_PATTERN.test(username);
}

const PAGE_SIZE = 1000;

type PagedResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Supabase caps a select() at PAGE_SIZE rows and truncates SILENTLY — no
 * error, just a short array — so every table read here pages instead of
 * trusting a single call. `movies` is the only one big enough to hit the cap
 * today (4,415 rows), but `profiles` is the one that eventually will: QA
 * accounts are still being written to it, and the test-username filter runs
 * in JS *after* the fetch, so a truncated read would spend the row budget on
 * junk and drop real profiles off the end.
 *
 * The .order() every caller passes is load-bearing, not tidiness. Postgres
 * guarantees no stable row order without an ORDER BY, so offset paging over
 * an unordered result can skip or duplicate rows between requests — likeliest
 * exactly when something is writing to the table mid-crawl. Ordering by
 * primary key makes each page a deterministic slice of one sequence.
 */
async function fetchAllPages<T>(
  label: string,
  fetchPage: (from: number, to: number) => PromiseLike<PagedResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    // Throwing fails the build, which is the intent: a sitemap quietly
    // missing a whole table is worse than a deploy that stops and says which
    // one. Labelled because all three callers land on this same line.
    if (error) throw new Error(`sitemap: failed to page ${label}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [movies, collections, profiles] = await Promise.all([
    fetchAllPages('movies', (from, to) =>
      supabaseAdmin
        .from('movies')
        .select('id, title, updated_at')
        .order('id', { ascending: true })
        .range(from, to)
    ),
    fetchAllPages('film_collections', (from, to) =>
      supabaseAdmin
        .from('film_collections')
        .select('slug, updated_at')
        .order('id', { ascending: true })
        .range(from, to)
    ),
    fetchAllPages('profiles', (from, to) =>
      supabaseAdmin
        .from('profiles')
        .select('username, updated_at')
        .not('username', 'is', null)
        .neq('username', '')
        .order('id', { ascending: true })
        .range(from, to)
    ),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
  }));

  const filmEntries: MetadataRoute.Sitemap = movies.map((movie) => ({
    url: `${siteUrl}/films/${movieSlug(movie.title, movie.id)}`,
    lastModified: movie.updated_at ?? undefined,
  }));

  const collectionEntries: MetadataRoute.Sitemap = collections.map((collection) => ({
    url: `${siteUrl}/films/collections/${collection.slug}`,
    lastModified: collection.updated_at ?? undefined,
  }));

  const profileEntries: MetadataRoute.Sitemap = profiles
    .filter((profile) => !isTestUsername(profile.username))
    .map((profile) => ({
      url: `${siteUrl}/${profile.username}`,
      lastModified: profile.updated_at ?? undefined,
    }));

  return [...staticEntries, ...filmEntries, ...collectionEntries, ...profileEntries];
}
