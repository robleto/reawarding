import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { searchTmdbMovies, type TmdbSearchHit } from "@/lib/tmdbImport";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const { query, year } = (await req.json()) as { query?: string; year?: number };
  if (!query || !query.trim()) {
    return NextResponse.json({ local: [], remote: [] });
  }

  let localQuery = supabase
    .from("movies")
    .select("id, title, release_year, thumb_url, poster_url, tmdb_id")
    .ilike("title", `%${query}%`);
  if (year) {
    localQuery = localQuery.eq("release_year", year);
  }

  const [{ data: local, error: localError }, remoteResult] = await Promise.all([
    localQuery.limit(7),
    searchTmdbMovies(query).catch((e) => {
      console.error("Live TMDB search failed", e);
      return [] as TmdbSearchHit[];
    }),
  ]);

  if (localError) {
    return NextResponse.json({ error: localError.message }, { status: 500 });
  }

  const localTmdbIds = new Set((local || []).map((m) => m.tmdb_id).filter(Boolean));
  const localTitleYears = new Set(
    (local || []).map((m) => `${m.title.toLowerCase()}::${m.release_year}`)
  );

  const remote = remoteResult
    .filter((hit) => !localTmdbIds.has(hit.tmdbId))
    .filter((hit) => !localTitleYears.has(`${hit.title.toLowerCase()}::${hit.releaseYear}`))
    .slice(0, 7);

  return NextResponse.json({ local: local || [], remote });
}
