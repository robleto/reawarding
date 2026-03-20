#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type SampleMovie = {
  id: number;
  tmdb_id: number | null;
  title: string;
  release_year: number | null;
  overview: string | null;
  runtime: number | null;
  director: string | null;
  cast_list: string[] | null;
  media_enriched_at: string | null;
  cached_at: string | null;
};

type FieldReport = {
  count: number;
  samples: SampleMovie[];
};

const SAMPLE_SIZE = 10;
const SAMPLE_SELECT =
  'id, tmdb_id, title, release_year, overview, runtime, director, cast_list, media_enriched_at, cached_at';

async function countRows(
  build: (
    query: ReturnType<typeof supabase.from<'movies', SampleMovie>>
  ) => ReturnType<typeof supabase.from<'movies', SampleMovie>>
) {
  const query = build(supabase.from('movies').select('id', { count: 'exact', head: true }));
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function sampleRows(
  build: (
    query: ReturnType<typeof supabase.from<'movies', SampleMovie>>
  ) => ReturnType<typeof supabase.from<'movies', SampleMovie>>
) {
  const query = build(
    supabase
      .from('movies')
      .select(SAMPLE_SELECT)
      .order('release_year', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true })
      .limit(SAMPLE_SIZE)
  );

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SampleMovie[];
}

async function makeReport(
  build: (
    query: ReturnType<typeof supabase.from<'movies', SampleMovie>>
  ) => ReturnType<typeof supabase.from<'movies', SampleMovie>>
): Promise<FieldReport> {
  const [count, samples] = await Promise.all([countRows(build), sampleRows(build)]);
  return { count, samples };
}

function printSamples(label: string, rows: SampleMovie[]) {
  console.log(`\n${label} samples:`);
  if (rows.length === 0) {
    console.log('  none');
    return;
  }

  for (const row of rows) {
    const year = row.release_year ?? 'n/a';
    const tmdb = row.tmdb_id ?? 'null';
    const enriched = row.media_enriched_at ? 'enriched' : 'not-enriched';
    console.log(`  - #${row.id} | tmdb:${tmdb} | ${row.title} (${year}) | ${enriched}`);
  }
}

async function main() {
  console.log('\nMetadata backlog report\n');

  const totalMovies = await countRows((query) => query);

  const reports = {
    missingTmdbId: await makeReport((query) => query.or('tmdb_id.is.null,tmdb_id.eq.0')),
    missingOverview: await makeReport((query) => query.or('overview.is.null,overview.eq.')),
    missingRuntime: await makeReport((query) => query.is('runtime', null)),
    missingDirector: await makeReport((query) => query.or('director.is.null,director.eq.')),
    missingCast: await makeReport((query) => query.is('cast_list', null)),
    notMediaEnriched: await makeReport((query) => query.is('media_enriched_at', null)),
    anyCoreGap: await makeReport((query) =>
      query.or(
        'tmdb_id.is.null,tmdb_id.eq.0,overview.is.null,overview.eq.,runtime.is.null,director.is.null,director.eq.,cast_list.is.null'
      )
    ),
  };

  const summary = {
    total_movies: totalMovies,
    missing_tmdb_id: reports.missingTmdbId.count,
    missing_overview: reports.missingOverview.count,
    missing_runtime: reports.missingRuntime.count,
    missing_director: reports.missingDirector.count,
    missing_cast_list: reports.missingCast.count,
    not_media_enriched: reports.notMediaEnriched.count,
    any_core_gap: reports.anyCoreGap.count,
  };

  console.log(JSON.stringify(summary, null, 2));

  printSamples('Missing TMDB ID', reports.missingTmdbId.samples);
  printSamples('Missing overview', reports.missingOverview.samples);
  printSamples('Missing runtime', reports.missingRuntime.samples);
  printSamples('Missing director', reports.missingDirector.samples);
  printSamples('Missing cast_list', reports.missingCast.samples);
  printSamples('Not media enriched', reports.notMediaEnriched.samples);
  printSamples('Any core gap', reports.anyCoreGap.samples);
}

main().catch((error) => {
  console.error('\nFailed to generate metadata backlog report.');
  console.error(error);
  process.exit(1);
});
