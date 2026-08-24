import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { siteUrl } from '@/lib/siteUrl';
import { movieSlug } from '@/utils/slug';

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

async function fetchAllMovies() {
  const rows: { id: string; title: string; updated_at: string | null }[] = [];
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE;
    // .order() is what makes the offset paging below correct, not just tidy:
    // Postgres guarantees no stable row order without an ORDER BY, so paging
    // by offset over an unordered result can skip or duplicate rows between
    // requests — likeliest exactly when a metadata refresh is writing to
    // `movies` mid-crawl. Order by the primary key so every page is a
    // deterministic slice of the same sequence.
    const { data, error } = await supabaseAdmin
      .from('movies')
      .select('id, title, updated_at')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [movies, { data: collections }, { data: profiles }] = await Promise.all([
    fetchAllMovies(),
    supabaseAdmin.from('film_collections').select('slug, updated_at'),
    supabaseAdmin.from('profiles').select('username, updated_at').not('username', 'is', null).neq('username', ''),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
  }));

  const filmEntries: MetadataRoute.Sitemap = movies.map((movie) => ({
    url: `${siteUrl}/films/${movieSlug(movie.title, movie.id)}`,
    lastModified: movie.updated_at ?? undefined,
  }));

  const collectionEntries: MetadataRoute.Sitemap = (collections ?? []).map((collection) => ({
    url: `${siteUrl}/films/collections/${collection.slug}`,
    lastModified: collection.updated_at ?? undefined,
  }));

  const profileEntries: MetadataRoute.Sitemap = (profiles ?? [])
    .filter((profile) => !isTestUsername(profile.username))
    .map((profile) => ({
      url: `${siteUrl}/${profile.username}`,
      lastModified: profile.updated_at ?? undefined,
    }));

  return [...staticEntries, ...filmEntries, ...collectionEntries, ...profileEntries];
}
