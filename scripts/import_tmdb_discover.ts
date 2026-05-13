#!/usr/bin/env tsx
/**
 * Discover movies via TMDB and insert minimal rows for later enrichment.
 *
 * Usage:
 *   TMDB_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *   tsx scripts/import_tmdb_discover.ts --pages=10 --revenue-pages=5 --year-from=2018 --min-votes=200
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !TMDB_API_KEY) {
  console.error('❌ Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';

interface TMDBDiscoverResult {
  id: number;
  title: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
}

interface DiscoverOptions {
  pages: number;
  revenuePages: number;
  yearFrom?: number;
  minVotes?: number;
}

function parseNumberArg(value: string | undefined) {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseArgs(argv: string[]): DiscoverOptions {
  const opts: DiscoverOptions = { pages: 10, revenuePages: 5 };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    const [key, rawValue] = arg.split('=');
    const value = rawValue ?? '';

    switch (key) {
      case '--pages':
        opts.pages = parseNumberArg(value) ?? opts.pages;
        break;
      case '--revenue-pages':
        opts.revenuePages = parseNumberArg(value) ?? opts.revenuePages;
        break;
      case '--year-from':
        opts.yearFrom = parseNumberArg(value);
        break;
      case '--min-votes':
        opts.minVotes = parseNumberArg(value);
        break;
      default:
        break;
    }
  }

  return opts;
}

function printHelp() {
  console.log(`\nTMDB Discover Importer\n`);
  console.log(`Usage:`);
  console.log(`  tsx scripts/import_tmdb_discover.ts --pages=10 --revenue-pages=5 --year-from=2018 --min-votes=200`);
  console.log(`\nOptions:`);
  console.log(`  --pages           Number of popularity pages to fetch (default: 10)`);
  console.log(`  --revenue-pages   Number of revenue pages to fetch (default: 5)`);
  console.log(`  --year-from       Filter releases on/after Jan 1 of this year`);
  console.log(`  --min-votes       Minimum TMDB vote_count to include`);
}

function buildDiscoverUrl(sortBy: string, page: number, opts: DiscoverOptions) {
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY as string,
    sort_by: sortBy,
    include_adult: 'false',
    include_video: 'false',
    region: 'US',
    page: String(page),
  });

  if (opts.yearFrom) {
    params.set('primary_release_date.gte', `${opts.yearFrom}-01-01`);
  }

  if (opts.minVotes && opts.minVotes > 0) {
    params.set('vote_count.gte', String(opts.minVotes));
  }

  return `https://api.themoviedb.org/3/discover/movie?${params.toString()}`;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

function mapMovie(movie: TMDBDiscoverResult) {
  const releaseDate = movie.release_date || null;
  const releaseYear = releaseDate ? parseInt(releaseDate.slice(0, 4), 10) : null;
  const posterUrl = movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null;
  const tmdbRating = movie.vote_average ? Number(movie.vote_average.toFixed(1)) : null;
  const popularity = movie.popularity ? Number(movie.popularity.toFixed(3)) : null;

  return {
    tmdb_id: movie.id,
    title: movie.title,
    overview: movie.overview || null,
    release_year: releaseYear,
    release_date: releaseDate,
    poster_url: posterUrl,
    thumb_url: posterUrl,
    tmdb_rating: tmdbRating,
    vote_count: movie.vote_count ?? null,
    popularity,
    updated_at: new Date().toISOString(),
  };
}

async function fetchExistingIds(ids: number[]) {
  const existing = new Set<number>();
  const chunkSize = 200;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase.from('movies').select('tmdb_id').in('tmdb_id', chunk);
    if (error) throw error;
    for (const row of data || []) {
      existing.add(row.tmdb_id as number);
    }
  }

  return existing;
}

async function insertMovies(rows: ReturnType<typeof mapMovie>[]) {
  if (!rows.length) return { inserted: 0 };

  const chunkSize = 200;
  let inserted = 0;

  // Upsert with ignoreDuplicates so cross-batch dups (revenue.desc almost
  // always overlaps popularity.desc for top earners) don't trip the
  // movies_tmdb_id_key unique constraint and fail the workflow.
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('movies')
      .upsert(chunk, { onConflict: 'tmdb_id', ignoreDuplicates: true });
    if (error) throw error;
    inserted += chunk.length;
  }

  return { inserted };
}

async function run() {
  const opts = parseArgs(process.argv.slice(2));

  console.log(`\n🔎 TMDB discover import`);
  console.log(`  Popularity pages: ${opts.pages}`);
  console.log(`  Revenue pages: ${opts.revenuePages}`);
  if (opts.yearFrom) console.log(`  Year from: ${opts.yearFrom}`);
  if (opts.minVotes) console.log(`  Min votes: ${opts.minVotes}`);

  const seen = new Set<number>();
  let discovered = 0;
  let inserted = 0;
  let skippedExisting = 0;
  let skippedNoPoster = 0;
  let errors = 0;

  const batches: Array<{ label: string; sortBy: string; pages: number }> = [
    { label: 'popularity', sortBy: 'popularity.desc', pages: opts.pages },
    { label: 'revenue', sortBy: 'revenue.desc', pages: opts.revenuePages },
  ];

  for (const batch of batches) {
    for (let page = 1; page <= batch.pages; page++) {
      const url = buildDiscoverUrl(batch.sortBy, page, opts);
      const data = await fetchJSON<{ results: TMDBDiscoverResult[] }>(url);

      const results = data.results || [];
      if (!results.length) continue;

      const pageIds = results.map(r => r.id).filter(id => !seen.has(id));
      for (const id of pageIds) seen.add(id);
      discovered += pageIds.length;

      const existing = await fetchExistingIds(pageIds);
      const toInsert: ReturnType<typeof mapMovie>[] = [];

      for (const movie of results) {
        if (existing.has(movie.id)) {
          skippedExisting++;
          continue;
        }

        if (!movie.poster_path) {
          skippedNoPoster++;
          continue;
        }

        toInsert.push(mapMovie(movie));
      }

      try {
        const { inserted: chunkInserted } = await insertMovies(toInsert);
        inserted += chunkInserted;
        console.log(`  ✅ ${batch.label} page ${page}: inserted ${chunkInserted}, skipped existing ${skippedExisting}`);
      } catch (err) {
        errors++;
        console.error(`  ❌ ${batch.label} page ${page} failed:`, err);
      }

      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log('\nDone.');
  console.log(
    JSON.stringify(
      {
        success: errors === 0,
        discovered,
        inserted,
        updated: 0,
        skipped_existing: skippedExisting,
        skipped_no_poster: skippedNoPoster,
        errors,
      },
      null,
      2,
    ),
  );

  if (errors > 0) process.exit(1);
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
