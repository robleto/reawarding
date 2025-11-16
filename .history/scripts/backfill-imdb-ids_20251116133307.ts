#!/usr/bin/env ts-node
/**
 * Backfill IMDb IDs for movies using TMDB external_ids
 *
 * Requirements:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - TMDB_API_KEY
 *
 * Usage examples:
 *   TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/backfill-imdb-ids.ts --limit=200 --dry-run
 *   TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/backfill-imdb-ids.ts --limit=1000
 *   TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/backfill-imdb-ids.ts --offset=500
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
  const out: any = { limit: 500, offset: 0, dryRun: false, concurrency: 5 };
  for (const a of args) {
    if (a.startsWith('--limit=')) out.limit = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--offset=')) out.offset = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--concurrency=')) out.concurrency = parseInt(a.split('=')[1], 10);
    else if (a === '--dry-run') out.dryRun = true;
  }
  return out;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

async function getMissingBatch(limit: number, offset: number) {
  const { data, error } = await supabase
    .from('movies')
    .select('id, title, release_year, tmdb_id, imdb_id')
    .or('imdb_id.is.null,imdb_id.eq.')
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data || [];
}

async function resolveImdbId(tmdbId: number): Promise<string | null> {
  try {
    const ext = await fetchJSON<{ imdb_id?: string | null }>(
      `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`
    );
    return ext.imdb_id || null;
  } catch (e) {
    return null;
  }
}

async function updateImdb(id: number, imdbId: string) {
  const { error } = await supabase
    .from('movies')
    .update({ imdb_id: imdbId })
    .eq('id', id);
  if (error) throw error;
}

async function main() {
  const { limit, offset, dryRun, concurrency } = parseArgs();
  console.log(`\n🎬 Backfilling IMDb IDs (limit=${limit}, offset=${offset}, dryRun=${dryRun}, concurrency=${concurrency})`);

  const batch = await getMissingBatch(limit, offset);
  const targets = batch.filter((r: any) => !r.imdb_id && !!r.tmdb_id);
  const noTmdb = batch.filter((r: any) => !r.imdb_id && !r.tmdb_id);
  if (noTmdb.length > 0) {
    console.warn(`⚠️  ${noTmdb.length} rows missing tmdb_id; skipping (set tmdb_id first).`);
  }
  console.log(`Found ${targets.length} movies missing IMDb ID (with tmdb_id).`);

  let updated = 0;
  let notFound = 0;
  let failed = 0;

  // Simple concurrency pool
  const queue = [...targets];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.max(1, concurrency); i++) {
    workers.push((async () => {
      while (queue.length) {
        const row = queue.shift() as any;
        try {
          const imdb = await resolveImdbId(Number(row.tmdb_id));
          if (!imdb) {
            notFound++;
            console.log(`— ${row.id} ${row.title} (${row.release_year}) → no imdb_id`);
            continue;
          }
          if (dryRun) {
            console.log(`✓ [dry-run] ${row.id} ${row.title} (${row.release_year}) → ${imdb}`);
          } else {
            await updateImdb(Number(row.id), imdb);
            console.log(`✓ ${row.id} ${row.title} (${row.release_year}) → ${imdb}`);
          }
          updated++;
        } catch (e: any) {
          failed++;
          console.warn(`✗ ${row.id} ${row.title} — ${e?.message || e}`);
        }
      }
    })());
  }

  await Promise.all(workers);

  console.log(`\n✅ Done. Updated: ${updated}, Missing: ${notFound}, Failed: ${failed}`);
}

main().catch((e) => {
  console.error('\n❌ Fatal error:', e);
  process.exit(1);
});
