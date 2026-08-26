import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { searchTmdbMovies, type TmdbSearchHit } from "@/lib/tmdbImport";
import { searchMoviesRanked } from "@/lib/movieSearch";

type LocalMovieHit = {
  id: string;
  title: string;
  release_year: number | null;
  thumb_url: string | null;
  poster_url: string | null;
  tmdb_id: number | null;
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const { query, year } = (await req.json()) as { query?: string; year?: number };
  if (!query || !query.trim()) {
    return NextResponse.json({ local: [], remote: [] });
  }

  const [local, remoteResult] = await Promise.all([
    searchMoviesRanked<LocalMovieHit>(supabase, query, {
      select: "id, title, release_year, thumb_url, poster_url, tmdb_id",
      limit: 7,
      filter: (q) => (year ? q.eq("release_year", year) : q),
    }),
    searchTmdbMovies(query).catch((e) => {
      console.error("Live TMDB search failed", e);
      return [] as TmdbSearchHit[];
    }),
  ]);

  const localTmdbIds = new Set(local.map((m) => m.tmdb_id).filter(Boolean));
  const localTitleYears = new Set(
    local.map((m) => `${m.title.toLowerCase()}::${m.release_year}`)
  );

  const remote = remoteResult
    .filter((hit) => !localTmdbIds.has(hit.tmdbId))
    .filter((hit) => !localTitleYears.has(`${hit.title.toLowerCase()}::${hit.releaseYear}`))
    .slice(0, 7);

  return NextResponse.json({ local, remote });
}
