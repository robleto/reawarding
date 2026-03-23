import { NextRequest, NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/admin/batch-enrich-missing
 *
 * Admin-only. Closes the 125-movie poster gap by fetching poster_path and
 * backdrop_path from TMDB for every movie that has a tmdb_id but no poster_url.
 *
 * Body: { limit?: number }   (default 20, max 50 per call to stay within timeouts)
 * Returns: { processed, updated, skipped, errors[], remaining }
 *
 * Call repeatedly until remaining === 0.
 */
export async function POST(request: NextRequest) {
  const adminOk = await isUserAdmin();
  if (!adminOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(Number(body?.limit) || 20, 50);

  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    return NextResponse.json(
      { error: "TMDB API key not configured" },
      { status: 500 }
    );
  }

  // Fetch the batch of movies missing a poster
  const { data: movies, error: fetchError } = await supabaseAdmin
    .from("movies")
    .select("id, tmdb_id, title")
    .is("poster_url", null)
    .not("tmdb_id", "is", null)
    .limit(limit);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!movies || movies.length === 0) {
    return NextResponse.json({
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      remaining: 0,
    });
  }

  // Count total remaining (for progress reporting)
  const { count: remaining } = await supabaseAdmin
    .from("movies")
    .select("id", { count: "exact", head: true })
    .is("poster_url", null)
    .not("tmdb_id", "is", null);

  const errors: string[] = [];
  let updated = 0;
  let skipped = 0;

  for (const movie of movies) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${tmdbApiKey}&language=en-US`
      );

      if (!res.ok) {
        errors.push(`${movie.title} (tmdb:${movie.tmdb_id}): HTTP ${res.status}`);
        skipped++;
        continue;
      }

      const data = (await res.json()) as {
        poster_path?: string | null;
        backdrop_path?: string | null;
      };

      const poster_url = data.poster_path
        ? `https://image.tmdb.org/t/p/original${data.poster_path}`
        : null;
      const backdrop_url = data.backdrop_path
        ? `https://image.tmdb.org/t/p/original${data.backdrop_path}`
        : null;

      if (!poster_url) {
        // TMDB itself has no poster for this film
        skipped++;
        continue;
      }

      const patch: Record<string, string | null> = { poster_url };
      if (backdrop_url) patch.backdrop_url = backdrop_url;

      const { error: updateError } = await supabaseAdmin
        .from("movies")
        .update(patch)
        .eq("id", movie.id);

      if (updateError) {
        errors.push(`${movie.title}: ${updateError.message}`);
        skipped++;
      } else {
        updated++;
      }
    } catch (err: any) {
      errors.push(`${movie.title}: ${err?.message ?? "Unknown error"}`);
      skipped++;
    }
  }

  return NextResponse.json({
    processed: movies.length,
    updated,
    skipped,
    errors,
    remaining: Math.max(0, (remaining ?? 0) - updated),
  });
}
