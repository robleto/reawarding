#!/usr/bin/env ts-node
/**
 * Refresh movie metadata from TMDB without affecting rankings
 * Usage: ts-node scripts/refresh-movie-metadata.ts <movie_id> <tmdb_id>
 * 
 * This updates all metadata fields (title, year, overview, runtime, poster, etc.)
 * while preserving existing rankings and user data.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TMDB_API_KEY = process.env.TMDB_API_KEY!;
const FANART_API_KEY = process.env.FANART_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TMDBMovieDetail {
  id: number;
  imdb_id?: string | null;
  title: string;
  overview?: string;
  runtime?: number | null;
  release_date?: string;
  poster_path?: string | null;
  genres?: { id: number; name: string }[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
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
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

async function refreshMovieMetadata(dbId: number, tmdbId: number) {
  console.log(`\n🔄 Refreshing metadata for DB ID ${dbId} using TMDB ID ${tmdbId}...\n`);

  // 1. Fetch movie details from TMDB
  console.log('📡 Fetching movie details from TMDB...');
  const detail: TMDBMovieDetail = await fetchJSON(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
  );

  // 2. Fetch external IDs
  console.log('📡 Fetching IMDb ID...');
  let imdb_id: string | null = null;
  try {
    const ext = await fetchJSON<{ imdb_id?: string | null }>(
      `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`
    );
    imdb_id = ext.imdb_id || null;
  } catch (e) {
    console.warn('⚠️  Could not fetch IMDb ID');
  }

  // 3. Fetch credits (director & cast)
  console.log('📡 Fetching credits...');
  let director: string | null = null;
  let cast_list: string[] | null = null;
  try {
    const credits: TMDBCredits = await fetchJSON(
      `https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`
    );
    if (credits.crew) {
      const dir = credits.crew.find(c => c.job === 'Director');
      director = dir?.name || null;
    }
    if (credits.cast) {
      cast_list = credits.cast.slice(0, 8).map(c => c.name);
    }
  } catch (e) {
    console.warn('⚠️  Could not fetch credits');
  }

  // 4. Fetch horizontal thumbnail from Fanart.tv
  console.log('📡 Fetching Fanart.tv thumbnail...');
  let thumb_url: string | null = null;
  if (FANART_API_KEY) {
    try {
      const fanart: FanartResponse = await fetchJSON(
        `https://webservice.fanart.tv/v3/movies/${tmdbId}?api_key=${FANART_API_KEY}`
      );
      if (fanart.moviethumb && fanart.moviethumb.length > 0) {
        thumb_url = fanart.moviethumb[0].url;
      }
    } catch (e) {
      console.warn('⚠️  Fanart.tv data not available');
    }
  }

  // 5. Build update payload
  const release_year = detail.release_date ? parseInt(detail.release_date.slice(0, 4), 10) : null;
  const poster_url = detail.poster_path 
    ? `https://image.tmdb.org/t/p/original${detail.poster_path}` 
    : null;
  const genres = detail.genres?.map(g => g.name) || [];
  const tmdb_rating = detail.vote_average ? Number(detail.vote_average.toFixed(1)) : null;
  const vote_count = detail.vote_count || 0;
  const vote_average = detail.vote_average ? Number(detail.vote_average.toFixed(1)) : null;
  const popularity = detail.popularity ? Number(detail.popularity.toFixed(3)) : null;

  const updateData = {
    tmdb_id: tmdbId,
    imdb_id,
    title: detail.title,
    overview: detail.overview || null,
    release_year,
    runtime: detail.runtime || null,
    poster_url,
    thumb_url,
    tmdb_rating,
    vote_count,
    vote_average,
    popularity,
    genres,
    director,
    cast_list,
    cached_at: new Date().toISOString()
  };

  console.log('\n📝 Updating database with:');
  console.log(`   Title: ${updateData.title}`);
  console.log(`   Year: ${updateData.release_year}`);
  console.log(`   Runtime: ${updateData.runtime} min`);
  console.log(`   Director: ${updateData.director || 'N/A'}`);
  console.log(`   Genres: ${updateData.genres.join(', ')}`);
  console.log(`   IMDb ID: ${updateData.imdb_id || 'N/A'}`);
  console.log(`   Poster: ${updateData.poster_url ? '✓' : '✗'}`);
  console.log(`   Thumb: ${updateData.thumb_url ? '✓' : '✗'}`);

  // 6. Update database (preserves rankings - they're in a separate table)
  const { error } = await supabase
    .from('movies')
    .update(updateData)
    .eq('id', dbId);

  if (error) {
    console.error('\n❌ Error updating database:', error);
    process.exit(1);
  }

  console.log('\n✅ Movie metadata updated successfully!');
  console.log(`   Database ID: ${dbId}`);
  console.log(`   TMDB ID: ${tmdbId}`);
  console.log('   Rankings preserved ✓\n');
}

// CLI execution
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('\n❌ Usage: ts-node scripts/refresh-movie-metadata.ts <db_id> <tmdb_id>\n');
  console.error('Example: ts-node scripts/refresh-movie-metadata.ts 123 550');
  console.error('         (updates DB movie #123 with data from TMDB movie #550)\n');
  process.exit(1);
}

const dbId = parseInt(args[0], 10);
const tmdbId = parseInt(args[1], 10);

if (isNaN(dbId) || isNaN(tmdbId)) {
  console.error('\n❌ Both arguments must be valid numbers\n');
  process.exit(1);
}

refreshMovieMetadata(dbId, tmdbId)
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
