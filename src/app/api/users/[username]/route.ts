import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const normalizeCategory = (value: string | null | undefined) =>
  (value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const supabase = await createSupabaseServerClient();

    // 1. Fetch profile by username
    const profileSelect =
      "id, username, first_name, last_name, full_name, preferred_name, avatar_url, bio, created_at, signature_picks";
    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(profileSelect)
      .eq("username", username)
      .single();

    // Backward compatibility before the signature_picks migration is applied.
    if (profileError && String(profileError.message || "").toLowerCase().includes("signature_picks")) {
      ({ data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, first_name, last_name, full_name, preferred_name, avatar_url, bio, created_at")
        .eq("username", username)
        .single());
    }

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Fetch all movies the user has ranked/seen (with their rankings) and
    // the user's award records concurrently — neither depends on the other's
    // result, only on profile.id.
    // Heavy, per-movie-detail-only columns (cast_list, backdrop_url) are
    // intentionally omitted here: they're only consumed by MovieDetailModal,
    // which fetches them itself via its own dedicated query.
    const [
      { data: movies, error: moviesError },
      { data: awards, error: awardsError },
    ] = await Promise.all([
      supabase
        .from("movies")
        .select(
          `
        id, title, release_year, poster_url, thumb_url,
        imdb_rating, metacritic_score, tmdb_rating,
        director, writer, genres, runtime, created_at,
        rankings!inner(ranking, seen_it, user_id)
      `
        )
        .eq("rankings.user_id", profile.id),
      // Count best-picture award years (any award record counts, regardless of winner selection).
      supabase
        .from("awards")
        .select("year, nominee_ids, winner_id, category")
        .eq("user_id", profile.id),
    ]);

    const allMovies = movies || [];
    if (moviesError) {
      console.error("Error fetching user movies:", moviesError);
    }

    // 3. Count stats
    const ratedMovies = allMovies.filter(
      (m: any) => typeof m.rankings?.[0]?.ranking === "number"
    );
    const seenMovies = allMovies.filter((m: any) => m.rankings?.[0]?.seen_it);

    if (awardsError) {
      console.error("Error fetching user award stats:", awardsError);
    }

    const awardYears = new Set<number>(
      (awards || [])
        .filter((a: any) => normalizeCategory(a.category) === "best-picture")
        .map((a: any) => Number(a.year))
    );

    // Public profile surfaces "awards" from the user's ranking history as well,
    // not only persisted award rows. Keep the header count aligned with that UI.
    const derivedAwardYears = new Set<number>(
      ratedMovies
        .map((m: any) => Number(m.release_year))
        .filter((y: number) => Number.isFinite(y))
    );

    const displayAwardYears = awardYears.size > 0 ? awardYears : derivedAwardYears;

    const stats = {
      // Rankings = count with 1-10 ratings
      rated: ratedMovies.length,
      // Films = count marked as seen
      seen: seenMovies.length,
      // Awards = saved ballot years when present; fallback to derived years for older profiles
      awards: displayAwardYears.size,
      films: seenMovies.length,
    };

    // Surface best-picture awards so the public AwardsGallery can respect the
    // user's actual saved winner instead of guessing "highest-rated nominee".
    const bestPictureAwards = (awards || []).filter(
      (a: any) => normalizeCategory(a.category) === "best-picture"
    );

    return NextResponse.json({
      profile,
      movies: allMovies,
      stats,
      awards: bestPictureAwards,
    }, {
      // Public profile data: profiles/movies/rankings/awards all carry public
      // "readable by anyone" RLS policies (qual: true), so this response does
      // not vary by viewer even though createSupabaseServerClient() reads the
      // viewer's auth cookies. Safe to cache briefly at the edge/CDN.
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error in user profile API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
