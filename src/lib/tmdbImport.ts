/**
 * Shared TMDB search/import logic — used by the admin import route, the
 * live search-bar fallback, and the CSV (Letterboxd/IMDb) import backfill.
 */
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type TmdbSearchHit = {
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  overview: string | null;
  voteCount: number;
};

export type ImportedMovieRow = {
  id: string;
  tmdb_id: number;
  title: string;
  release_year: number | null;
  poster_url: string;
  thumb_url: string;
  created_at: string;
};

function tmdbApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY not configured");
  return key;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Search TMDB by title. Excludes adult content, mirrors the discover ingest convention. */
export async function searchTmdbMovies(query: string): Promise<TmdbSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", tmdbApiKey());
  url.searchParams.set("query", trimmed);
  url.searchParams.set("include_adult", "false");

  const data = await fetchJson<{
    results: Array<{
      id: number;
      title: string;
      release_date?: string;
      poster_path?: string | null;
      overview?: string;
      vote_count?: number;
    }>;
  }>(url.toString());

  return (data.results || []).map((m) => ({
    tmdbId: m.id,
    title: m.title,
    releaseYear: m.release_date ? parseInt(m.release_date.slice(0, 4), 10) || null : null,
    posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    overview: m.overview || null,
    voteCount: m.vote_count ?? 0,
  }));
}

/** Resolve an IMDb tt-id to a TMDB movie id, for precise CSV-import matching. */
export async function findTmdbIdByImdbId(imdbId: string): Promise<number | null> {
  const url = new URL(`https://api.themoviedb.org/3/find/${imdbId}`);
  url.searchParams.set("api_key", tmdbApiKey());
  url.searchParams.set("external_source", "imdb_id");

  const data = await fetchJson<{ movie_results?: Array<{ id: number }> }>(url.toString());
  return data.movie_results?.[0]?.id ?? null;
}

/**
 * Fetch full TMDB movie details and upsert into `movies` (on tmdb_id),
 * preserving any manually-curated poster/thumb already on the row.
 * Returns the resulting row. Logs the import for audit purposes.
 */
export async function importTmdbMovie(
  tmdbId: number,
  source: string = "unknown"
): Promise<ImportedMovieRow> {
  const apiKey = tmdbApiKey();
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=en-US`
  );
  if (!tmdbRes.ok) {
    throw new Error(`TMDB movie ${tmdbId} not found`);
  }
  const movie = await tmdbRes.json();

  let fanartThumb: string | null = null;
  try {
    const fanartApiKey = process.env.FANART_API_KEY;
    if (fanartApiKey && movie.imdb_id) {
      const fanartRes = await fetch(
        `https://webservice.fanart.tv/v3/movies/${movie.imdb_id}?api_key=${fanartApiKey}`
      );
      if (fanartRes.ok) {
        const fanartData = await fanartRes.json();
        if (fanartData.moviethumb?.length > 0) {
          fanartThumb = fanartData.moviethumb[0].url;
        } else if (fanartData.hdmovielogo?.length > 0) {
          fanartThumb = fanartData.hdmovielogo[0].url;
        }
      }
    }
  } catch (e) {
    console.error("FanArt.tv fetch error", e);
  }

  let existingMovie: { poster_url: string | null; thumb_url: string | null } | null = null;
  try {
    const { data } = await supabaseAdmin
      .from("movies")
      .select("poster_url, thumb_url")
      .eq("tmdb_id", Number(movie.id))
      .maybeSingle();
    existingMovie = data;
  } catch (e) {
    console.error("Error fetching existing movie for manual image preservation", e);
  }

  const insertData = {
    tmdb_id: Number(movie.id),
    title: movie.title,
    release_year: parseInt((movie.release_date || "").slice(0, 4), 10) || null,
    poster_url:
      existingMovie?.poster_url && existingMovie.poster_url !== ""
        ? existingMovie.poster_url
        : movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : "",
    thumb_url:
      existingMovie?.thumb_url && existingMovie.thumb_url !== ""
        ? existingMovie.thumb_url
        : fanartThumb || (movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : ""),
    genres: Array.isArray(movie.genres) ? movie.genres.map((g: { name: string }) => g.name) : null,
    runtime: movie.runtime || null,
    overview: movie.overview || null,
    imdb_id: movie.imdb_id || null,
    release_date: movie.release_date || null,
    cached_at: new Date().toISOString(),
  };

  const { data: upserted, error } = await supabaseAdmin
    .from("movies")
    .upsert(insertData, { onConflict: "tmdb_id" })
    .select("id, tmdb_id, title, release_year, poster_url, thumb_url, created_at")
    .single();

  if (error || !upserted) {
    console.error("Supabase upsert error:", error);
    throw new Error(error?.message || "Failed to upsert movie");
  }

  try {
    await supabaseAdmin.from("imports").insert({
      tmdb_id: Number(movie.id),
      imported_at: new Date().toISOString(),
      poster_url: insertData.poster_url,
      thumb_url: insertData.thumb_url,
      fanart_thumb_url: fanartThumb || null,
      status: "success",
      notes: `source:${source}`,
    });
  } catch (e) {
    console.error("Failed to log movie import", e);
  }

  return upserted as ImportedMovieRow;
}
