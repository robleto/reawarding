// Import specific movies by TMDB ID
// Usage: npx tsx scripts/import-specific-movies.ts <tmdb_id1> <tmdb_id2> ...

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TMDB_API_KEY = process.env.TMDB_API_KEY!;
const FANART_API_KEY = process.env.FANART_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TMDBMovieDetail {
  id: number;
  imdb_id?: string | null;
  title: string;
  original_title?: string;
  original_language?: string;
  overview?: string;
  runtime?: number | null;
  release_date?: string;
  status?: string;
  genres?: { id: number; name: string }[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  poster_path?: string | null;
}

interface TMDBCredits {
  cast?: { name: string }[];
  crew?: { name: string; job: string }[];
}

interface FanartResponse {
  tmdb_id?: string;
  moviethumb?: { url: string }[];
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

async function importMovie(tmdbId: number) {
  console.log(`\n📥 Importing TMDB ID ${tmdbId}...`);

  // Details
  const detail: TMDBMovieDetail = await fetchJSON(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`);
  console.log(`   Title: ${detail.title} (${detail.release_date})`);

  // External IDs (IMDb)
  let imdb_id: string | null = null;
  try {
    const ext = await fetchJSON<{ imdb_id?: string | null }>(`https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`);
    imdb_id = ext.imdb_id || null;
    if (imdb_id) console.log(`   IMDb ID: ${imdb_id}`);
  } catch {}

  // Credits for director & cast
  let director: string | undefined;
  let cast_list: string[] | undefined;
  try {
    const credits: TMDBCredits = await fetchJSON(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`);
    if (credits.crew) {
      const dir = credits.crew.find(c => c.job === 'Director');
      director = dir?.name;
      if (director) console.log(`   Director: ${director}`);
    }
    if (credits.cast) {
      cast_list = credits.cast.slice(0, 8).map(c => c.name); // top 8 cast
    }
  } catch {}

  // Fetch horizontal thumbnail from Fanart.tv
  let thumb_url: string | null = null;
  if (FANART_API_KEY) {
    try {
      const fanartData: FanartResponse = await fetchJSON(`https://webservice.fanart.tv/v3/movies/${tmdbId}?api_key=${FANART_API_KEY}`);
      if (fanartData.moviethumb && fanartData.moviethumb.length > 0) {
        thumb_url = fanartData.moviethumb[0].url;
        console.log(`   Thumb URL: ${thumb_url}`);
      }
    } catch {
      // Fanart.tv data not available - continue without thumb
    }
  }

  const release_year = detail.release_date ? parseInt(detail.release_date.slice(0, 4), 10) : null;
  const poster_url = detail.poster_path ? `https://image.tmdb.org/t/p/original${detail.poster_path}` : null;
  const genres = detail.genres?.map(g => g.name) || [];
  const tmdb_rating = detail.vote_average ? Number(detail.vote_average.toFixed(1)) : null;
  const vote_count = detail.vote_count || 0;
  const vote_average = detail.vote_average ? Number(detail.vote_average.toFixed(1)) : null;
  const popularity = detail.popularity ? Number(detail.popularity.toFixed(3)) : null;

  console.log(`   Release Year: ${release_year}, Votes: ${vote_count}, Rating: ${tmdb_rating}, Popularity: ${popularity}`);

  const payload = {
    tmdb_id: tmdbId,
    imdb_id,
    title: detail.title,
    original_title: detail.original_title || null,
    original_language: detail.original_language || null,
    overview: detail.overview || null,
    release_year,
    release_date: detail.release_date || null,
    status: detail.status || null,
    runtime: detail.runtime || null,
    poster_url,
    thumb_url,
    tmdb_rating,
    vote_count,
    vote_average,
    popularity,
    genres,
    director: director || null,
    cast_list: cast_list || null,
    cached_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('movies')
    .upsert(payload, { onConflict: 'tmdb_id' });

  if (error) {
    console.error(`   ❌ Upsert failed: ${error.message}`);
    throw error;
  }

  console.log(`   ✅ Successfully imported ${detail.title}`);
}

async function main() {
  const tmdbIds = process.argv.slice(2).map(id => parseInt(id, 10));

  if (tmdbIds.length === 0) {
    console.error('Usage: npx tsx scripts/import-specific-movies.ts <tmdb_id1> <tmdb_id2> ...');
    console.error('\nExample TMDB IDs:');
    console.error('  Wicked (2024): 402431');
    console.error('  Zootopia 2 (2025): 748230');
    process.exit(1);
  }

  console.log(`🎬 Importing ${tmdbIds.length} movie(s) from TMDB...`);

  for (const tmdbId of tmdbIds) {
    try {
      await importMovie(tmdbId);
      // Rate limiting delay
      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      console.error(`Failed to import TMDB ID ${tmdbId}:`, e);
    }
  }

  console.log('\n✅ Import complete!');
}

main().catch(console.error);
