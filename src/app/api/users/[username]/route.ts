import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const supabase = await createSupabaseServerClient();

    // 1. Fetch profile by username
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, first_name, last_name, full_name, preferred_name, avatar_url, bio, created_at")
      .eq("username", username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Fetch all movies the user has ranked/seen (with their rankings)
    const { data: movies, error: moviesError } = await supabase
      .from("movies")
      .select(
        `
        id, title, release_year, poster_url, thumb_url, cached_poster_url,
        backdrop_url, imdb_rating, metacritic_score, tmdb_rating,
        director, writer, cast_list, genres, runtime, created_at,
        rankings!inner(ranking, seen_it, user_id)
      `
      )
      .eq("rankings.user_id", profile.id);

    const allMovies = movies || [];
    if (moviesError) {
      console.error("Error fetching user movies:", moviesError);
    }

    // 3. Count stats
    const ratedMovies = allMovies.filter(
      (m: any) => typeof m.rankings?.[0]?.ranking === "number"
    );
    const seenMovies = allMovies.filter((m: any) => m.rankings?.[0]?.seen_it);

    // Count best-picture award years where a winner has been selected.
    const { data: awards, error: awardsError } = await supabase
      .from("awards")
      .select("year, nominee_ids, winner_id")
      .eq("user_id", profile.id)
      .eq("category", "best-picture");
    if (awardsError) {
      console.error("Error fetching user award stats:", awardsError);
    }

    const completedAwardYears = new Set<number>();
    for (const award of awards || []) {
      if (award.winner_id) {
        completedAwardYears.add(Number(award.year));
      }
    }

    const stats = {
      // Rankings = count with 1-10 ratings
      rated: ratedMovies.length,
      // Films = count marked as seen
      seen: seenMovies.length,
      // Awards = years with a selected winner
      awards: completedAwardYears.size,
      films: seenMovies.length,
    };

    return NextResponse.json({
      profile,
      movies: allMovies,
      stats,
    });
  } catch (error) {
    console.error("Error in user profile API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
