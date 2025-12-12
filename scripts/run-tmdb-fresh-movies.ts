// Run the tmdb-fresh-movies ingestion logic locally against Supabase using the service role key.
// Usage: npx tsx scripts/run-tmdb-fresh-movies.ts

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TMDB_API_KEY = process.env.TMDB_API_KEY!;
const FANART_API_KEY = process.env.FANART_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TMDB_API_KEY) {
  console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TMDBMovieBasic {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  vote_count?: number;
  popularity?: number;
}

interface TMDBMovieDetail {
  id: number;
  title: string;
  imdb_id?: string | null;
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
  moviethumb?: { url: string }[];
}

type SourceKind = 'now_playing' | 'popular' | 'upcoming';

function parseISODate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWithinDays(d: Date, days: number) {
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - d.getTime());
  return diffMs <= days * 24 * 60 * 60 * 1000;
}

function shouldImportCandidate(movie: TMDBMovieBasic, source: SourceKind) {
  if (!movie.poster_path) return false;

  const voteCount = movie.vote_count || 0;
  const popularity = movie.popularity || 0;

  if (source === 'popular') {
    const releaseDate = parseISODate(movie.release_date);
    if (!releaseDate) return false;
    if (!isWithinDays(releaseDate, 365)) return false;
  }

  if (popularity > 0 && popularity < 10) return false;
  if (voteCount >= 100) return true;

  const releaseDate = parseISODate(movie.release_date);
  if (!releaseDate) return false;
  if (source === 'popular') return false;

  if (!isWithinDays(releaseDate, 45)) return false;
  return popularity >= 50;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

async function importMovie(tmdbId: number) {
  const detail: TMDBMovieDetail = await fetchJSON(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`);

  let imdb_id: string | null = null;
  try {
    const ext = await fetchJSON<{ imdb_id?: string | null }>(`https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`);
    imdb_id = ext.imdb_id || null;
  } catch {}

  let director: string | undefined;
  let cast_list: string[] | undefined;
  try {
    const credits: TMDBCredits = await fetchJSON(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`);
    if (credits.crew) {
      const dir = credits.crew.find(c => c.job === 'Director');
      director = dir?.name;
    }
    if (credits.cast) {
      cast_list = credits.cast.slice(0, 8).map(c => c.name);
    }
  } catch {}

  let thumb_url: string | null = null;
  if (FANART_API_KEY) {
    try {
      const fanartData: FanartResponse = await fetchJSON(`https://webservice.fanart.tv/v3/movies/${tmdbId}?api_key=${FANART_API_KEY}`);
      if (fanartData.moviethumb?.length) thumb_url = fanartData.moviethumb[0].url;
    } catch {}
  }

  const release_year = detail.release_date ? parseInt(detail.release_date.slice(0, 4), 10) : null;
  const poster_url = detail.poster_path ? `https://image.tmdb.org/t/p/original${detail.poster_path}` : null;
  const genres = detail.genres?.map(g => g.name) || [];
  const tmdb_rating = detail.vote_average ? Number(detail.vote_average.toFixed(1)) : null;
  const vote_count = detail.vote_count || 0;
  const vote_average = detail.vote_average ? Number(detail.vote_average.toFixed(1)) : null;
  const popularity = detail.popularity ? Number(detail.popularity.toFixed(3)) : null;

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
    cached_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('movies').upsert(payload, { onConflict: 'tmdb_id' });
  if (error) throw new Error(error.message);

  return {
    tmdb_id: tmdbId,
    title: detail.title,
    release_date: detail.release_date || null,
    vote_count,
    popularity,
  };
}

async function main() {
  const MAX_IMPORTS_PER_RUN = 120;

  const endpoints: Array<{ kind: SourceKind; pages: number; url: string }> = [
    { kind: 'now_playing', pages: 6, url: `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&region=US&page=1` },
    { kind: 'popular', pages: 5, url: `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&region=US&page=1` },
    { kind: 'upcoming', pages: 6, url: `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&region=US&page=1` },
  ];

  const processed = new Set<number>();
  const skipped = new Set<number>();
  const imported: Array<{ tmdb_id: number; title: string; release_date: string | null; vote_count: number; popularity: number | null }> = [];
  const errors: Record<number, string> = {};

  console.log(`▶ Running tmdb-fresh-movies (max ${MAX_IMPORTS_PER_RUN} imports)...`);

  for (const endpoint of endpoints) {
    for (let page = 1; page <= endpoint.pages; page++) {
      if (imported.length >= MAX_IMPORTS_PER_RUN) break;

      const pageUrl = endpoint.url.replace(/page=\d+/, `page=${page}`);
      const data = await fetchJSON<{ results: TMDBMovieBasic[] }>(pageUrl);

      for (const basic of data.results) {
        if (imported.length >= MAX_IMPORTS_PER_RUN) break;

        if (processed.has(basic.id) || skipped.has(basic.id)) {
          skipped.add(basic.id);
          continue;
        }

        if (!shouldImportCandidate(basic, endpoint.kind)) {
          skipped.add(basic.id);
          continue;
        }

        try {
          const rec = await importMovie(basic.id);
          processed.add(basic.id);
          imported.push(rec);
          console.log(`  ✅ ${rec.title} (${rec.release_date ?? 'n/a'}) votes=${rec.vote_count} pop=${rec.popularity ?? 'n/a'}`);
        } catch (e) {
          errors[basic.id] = e instanceof Error ? e.message : String(e);
          processed.add(basic.id);
        }

        await new Promise(r => setTimeout(r, 140));
      }
    }
  }

  console.log(`\nDone.`);
  console.log(
    JSON.stringify(
      {
        success: true,
        imported: imported.length,
        skipped: skipped.size,
        errorsCount: Object.keys(errors).length,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
