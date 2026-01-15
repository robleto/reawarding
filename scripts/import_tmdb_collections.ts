#!/usr/bin/env tsx
/**
 * Import franchise movies using TMDB collection IDs (belongs_to_collection).
 *
 * Usage:
 *   TMDB_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... tsx scripts/import_tmdb_collections.ts
 *
 * Notes:
 * - Inserts/updates movies with minimal fields so they appear in admin search.
 * - Run enrich_movies.py afterwards to fill full metadata and collection names.
 */

import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

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

const COLLECTION_IDS: Record<string, number> = {
  'fast-and-furious': 9485,
  'avengers': 86311, // partial MCU coverage but good anchor
  'star-wars': 10,
  'x-men': 748,
  'star-trek': 151,
};

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';

async function fetchCollection(collectionId: number) {
  const url = `https://api.themoviedb.org/3/collection/${collectionId}?api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error ${res.status}`);
  return res.json();
}

function mapMovie(part: any) {
  const releaseDate = part?.release_date || null;
  const releaseYear = releaseDate ? parseInt(releaseDate.slice(0, 4), 10) : null;
  const posterUrl = part?.poster_path ? `${TMDB_IMAGE_BASE}${part.poster_path}` : null;

  return {
    tmdb_id: part.id,
    title: part.title || part.name,
    overview: part.overview || null,
    release_year: releaseYear,
    poster_url: posterUrl,
    thumb_url: posterUrl,
    tmdb_rating: part.vote_average || null,
    updated_at: new Date().toISOString(),
  };
}

async function upsertMovies(movies: any[]) {
  const chunkSize = 200;
  for (let i = 0; i < movies.length; i += chunkSize) {
    const chunk = movies.slice(i, i + chunkSize);
    const { error } = await supabase.from('movies').upsert(chunk, { onConflict: 'tmdb_id' });
    if (error) throw error;
  }
}

async function run() {
  for (const [slug, collectionId] of Object.entries(COLLECTION_IDS)) {
    try {
      console.log(`\n📦 Importing TMDB collection ${collectionId} (${slug})`);
      const data = await fetchCollection(collectionId);
      const parts = data?.parts || [];
      console.log(`  Found ${parts.length} movies in TMDB collection`);

      const movies = parts.map(mapMovie);
      await upsertMovies(movies);
      console.log(`  ✅ Upserted ${movies.length} movies`);
    } catch (err) {
      console.error(`  ❌ Failed for ${slug}:`, err);
    }
  }

  console.log('\nDone. Run enrich_movies.py next for full metadata.');
}

run();
