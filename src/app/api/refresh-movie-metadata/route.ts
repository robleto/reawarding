import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isUserAdmin } from '@/lib/adminAuth';

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

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { dbId, tmdbId } = await request.json();

    if (!dbId || !tmdbId) {
      return NextResponse.json(
        { error: "Both dbId and tmdbId are required" },
        { status: 400 }
      );
    }

    const movieTmdbId = parseInt(tmdbId, 10);

    if (isNaN(movieTmdbId)) {
      return NextResponse.json(
        { error: "TMDB ID must be a valid number" },
        { status: 400 }
      );
    }

    // Get API keys
    const tmdbApiKey = process.env.TMDB_API_KEY;
    const fanartApiKey = process.env.FANART_API_KEY;

    if (!tmdbApiKey) {
      return NextResponse.json(
        { error: "TMDB API key not configured" },
        { status: 500 }
      );
    }

    // 1. Fetch movie details from TMDB
    const detail: TMDBMovieDetail = await fetchJSON(
      `https://api.themoviedb.org/3/movie/${movieTmdbId}?api_key=${tmdbApiKey}`
    );

    // 2. Fetch external IDs
    let imdb_id: string | null = null;
    try {
      const ext = await fetchJSON<{ imdb_id?: string | null }>(
        `https://api.themoviedb.org/3/movie/${movieTmdbId}/external_ids?api_key=${tmdbApiKey}`
      );
      imdb_id = ext.imdb_id || null;
    } catch {}

    // 3. Fetch credits
    let director: string | null = null;
    let cast_list: string[] | null = null;
    try {
      const credits: TMDBCredits = await fetchJSON(
        `https://api.themoviedb.org/3/movie/${movieTmdbId}/credits?api_key=${tmdbApiKey}`
      );
      if (credits.crew) {
        const dir = credits.crew.find((c) => c.job === "Director");
        director = dir?.name || null;
      }
      if (credits.cast) {
        cast_list = credits.cast.slice(0, 8).map((c) => c.name);
      }
    } catch {}

    // 4. Fetch Fanart.tv thumbnail
    let thumb_url: string | null = null;
    if (fanartApiKey) {
      try {
        const fanart: FanartResponse = await fetchJSON(
          `https://webservice.fanart.tv/v3/movies/${movieTmdbId}?api_key=${fanartApiKey}`
        );
        if (fanart.moviethumb && fanart.moviethumb.length > 0) {
          thumb_url = fanart.moviethumb[0].url;
        }
      } catch {}
    }

    // 5. Build update payload
    const release_year = detail.release_date
      ? parseInt(detail.release_date.slice(0, 4), 10)
      : null;
    const poster_url = detail.poster_path
      ? `https://image.tmdb.org/t/p/original${detail.poster_path}`
      : null;
    const genres = detail.genres?.map((g) => g.name) || [];
    const tmdb_rating = detail.vote_average
      ? Number(detail.vote_average.toFixed(1))
      : null;
    const vote_count = detail.vote_count || 0;
    const vote_average = detail.vote_average
      ? Number(detail.vote_average.toFixed(1))
      : null;
    const popularity = detail.popularity
      ? Number(detail.popularity.toFixed(3))
      : null;

    const updateData = {
      tmdb_id: movieTmdbId,
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
      cached_at: new Date().toISOString(),
    };

    // 6. Update database using admin client (bypasses RLS)
    const { error } = await supabaseAdmin
      .from("movies")
      .update(updateData)
      .eq("id", dbId); // Use dbId as string (works for UUID or integer)

    if (error) {
      console.error("Supabase update error:", error);
      console.error("Update data:", updateData);
      console.error("Movie DB ID:", dbId);
      return NextResponse.json(
        { 
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      movie: {
        title: detail.title,
        year: release_year,
        runtime: detail.runtime,
        director,
        genres,
        poster_url,
        thumb_url,
      },
    });
  } catch (error: any) {
    console.error("Error refreshing movie metadata:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error occurred" },
      { status: 500 }
    );
  }
}
