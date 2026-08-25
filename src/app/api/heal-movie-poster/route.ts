import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/heal-movie-poster
 *
 * Lightweight on-demand poster heal. Called when a movie detail view opens
 * on a movie with a missing poster_url. Requires any authenticated user
 * (not admin-only).
 *
 * Body: { dbId: string; tmdbId: number }  (movies.id is a UUID, not numeric)
 * Returns: { poster_url: string | null; backdrop_url: string | null }
 */
export async function POST(request: NextRequest) {
  // Require authenticated user
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { dbId, tmdbId } = body ?? {};

  if (!dbId || !tmdbId) {
    return NextResponse.json(
      { error: "dbId and tmdbId are required" },
      { status: 400 }
    );
  }

  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    return NextResponse.json(
      { error: "TMDB API key not configured" },
      { status: 500 }
    );
  }

  // Single TMDB call — just movie details for poster + backdrop
  let poster_url: string | null = null;
  let backdrop_url: string | null = null;

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbApiKey}&language=en-US`
    );
    if (res.ok) {
      const data = (await res.json()) as {
        poster_path?: string | null;
        backdrop_path?: string | null;
      };
      poster_url = data.poster_path
        ? `https://image.tmdb.org/t/p/original${data.poster_path}`
        : null;
      backdrop_url = data.backdrop_path
        ? `https://image.tmdb.org/t/p/original${data.backdrop_path}`
        : null;
    }
  } catch (err) {
    console.error("[heal-movie-poster] TMDB fetch failed:", err);
    return NextResponse.json(
      { error: "TMDB fetch failed" },
      { status: 502 }
    );
  }

  // Only write fields that actually have values — don't overwrite with null
  const patch: Record<string, string> = {};
  if (poster_url) patch.poster_url = poster_url;
  if (backdrop_url) patch.backdrop_url = backdrop_url;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabaseAdmin
      .from("movies")
      .update(patch)
      .eq("id", dbId);

    if (error) {
      console.error("[heal-movie-poster] DB update failed:", error);
      // Still return the URLs so the UI can display them even if save failed
    }
  }

  return NextResponse.json({ poster_url, backdrop_url });
}
