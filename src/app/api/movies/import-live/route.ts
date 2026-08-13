import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { importTmdbMovie } from "@/lib/tmdbImport";

/**
 * Narrow, user-triggered import: adds the single TMDB movie the user just
 * picked from live search results (src/components/home/MovieSearchPicker.tsx).
 * Any authenticated user may call this — unlike /api/import-tmdb-movie,
 * which is the admin bulk/arbitrary-ID tool.
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { tmdbId } = (await req.json()) as { tmdbId?: number };
  if (!tmdbId || !Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "Missing or invalid TMDB ID" }, { status: 400 });
  }

  try {
    const movie = await importTmdbMovie(tmdbId, "live-search");
    return NextResponse.json({ movie });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
