#!/usr/bin/env ts-node
/**
 * Backfill TMDB IDs (and IMDb IDs) for movies missing tmdb_id, using TMDB search by title/year.
 * If a TMDB match is found, we also fetch external_ids to set imdb_id.
 *
 * Requirements:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - TMDB_API_KEY
 *
 * Usage examples:
 *   TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/backfill-tmdb-ids.ts --limit=200 --dry-run
 *   TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/backfill-tmdb-ids.ts --limit=500 --offset=1000 --concurrency=5
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TMDB_API_KEY = process.env.TMDB_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!TMDB_API_KEY) {
  console.error('Missing TMDB_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseArgs() {
  const args = process.argv.slice(2);
  const out: any = { limit: 300, offset: 0, dryRun: false, concurrency: 4 };
  for (const a of args) {
    if (a.startsWith('--limit=')) out.limit = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--offset=')) out.offset = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--concurrency=')) out.concurrency = parseInt(a.split('=')[1], 10);
    else if (a === '--dry-run') out.dryRun = true;
  }
  return out;
}

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

async function tmdbSearch(title: string, year?: number | null) {
  const url = new URL('https://api.themoviedb.org/3/search/movie');
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('query', title);
  if (year && Number.isFinite(year)) {
    url.searchParams.set('year', String(year));
  }
  const data: any = await fetchJSON(url.toString());
  return Array.isArray(data?.results) ? data.results : [];
}

async function tmdbExternalIds(tmdbId: number): Promise<{ imdb_id?: string | null }> {
  return fetchJSON(`https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`);
}

function pickBestMatch(title: string, year: number | null | undefined, results: any[]) {
  const normQuery = normalizeTitle(title);
  let best: any = null;
  let bestScore = -1;
  for (const r of results) {
    const rTitle = r?.title || r?.original_title || '';
    const normR = normalizeTitle(rTitle);
    const rYear = r?.release_date ? parseInt(String(r.release_date).slice(0, 4), 10) : null;

    let score = 0;
    if (normR === normQuery) score += 10; // exact normalized match
    else if (normR.includes(normQuery) || normQuery.includes(normR)) score += 6; // partial

    if (year && rYear) {
      if (rYear === year) score += 6;
      else if (Math.abs(rYear - year) === 1) score += 3;
    }

    // popularity bias to avoid obscure remakes with same title
    if (typeof r.popularity === 'number') score += Math.min(5, Math.round(r.popularity / 10));

    if (score > bestScore) { bestScore = score; best = r; }
  }
  // require a minimum confidence
  if (best && bestScore >= 10) return best;
  return null;
}

async function getMissingBatch(limit: number, offset: number) {
  const { data, error } = await supabase
    .from('movies')
    .select('id, title, release_year, tmdb_id, imdb_id')
    .or('tmdb_id.is.null,tmdb_id.eq.0')
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data || [];
}

async function updateIds(id: number, tmdbId: number, imdbId: string | null) {
  const payload: any = { tmdb_id: tmdbId };
  if (imdbId) payload.imdb_id = imdbId;
  const { error } = await supabase
    .from('movies')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

async function main() {
  const { limit, offset, dryRun, concurrency } = parseArgs();
  console.log(`\n🎯 Backfilling TMDB (and IMDb) IDs (limit=${limit}, offset=${offset}, dryRun=${dryRun}, concurrency=${concurrency})`);

  const batch = await getMissingBatch(limit, offset);
  console.log(`Found ${batch.length} movies missing tmdb_id.`);

  let updated = 0, skipped = 0, failed = 0;

  const queue = [...batch];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.max(1, concurrency); i++) {
    workers.push((async () => {
      while (queue.length) {
        const row = queue.shift() as any;
        try {
          const year = row.release_year ? Number(row.release_year) : null;
          const results = await tmdbSearch(row.title, year || undefined);
          const best = pickBestMatch(row.title, year, results);
          if (!best) {
            skipped++;
            console.log(`— ${row.id} ${row.title} (${row.release_year || 'n/a'}) → no confident TMDB match`);
            continue;
          }

          const tmdbId = Number(best.id);
          let imdbId: string | null = null;
          try {
            const ext = await tmdbExternalIds(tmdbId);
            imdbId = ext?.imdb_id || null;
          } catch {}

          if (dryRun) {
            console.log(`✓ [dry-run] ${row.id} ${row.title} (${row.release_year || 'n/a'}) → tmdb:${tmdbId}${imdbId ? ` imdb:${imdbId}` : ''}`);
          } else {
            await updateIds(Number(row.id), tmdbId, imdbId);
            console.log(`✓ ${row.id} ${row.title} (${row.release_year || 'n/a'}) → tmdb:${tmdbId}${imdbId ? ` imdb:${imdbId}` : ''}`);
          }
          updated++;
        } catch (e: any) {
          failed++;
          console.warn(`✗ ${row?.id} ${row?.title} — ${e?.message || e}`);
        }
      }
    })());
  }

  await Promise.all(workers);
  console.log(`\n✅ Done. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((e) => {
  console.error('\n❌ Fatal error:', e);
  process.exit(1);
});
