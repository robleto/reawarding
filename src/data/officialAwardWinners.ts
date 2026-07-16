/**
 * Official Academy Award winners — sourced from public.official_award_winners
 * (see PRODUCT_DECISION_LOG.md, July 2026, "Premium Tier Direction").
 *
 * Replaces the old static BEST_PICTURE_WINNERS lookup (src/data/bestPictureWinners.ts),
 * which had two live bugs: the 1st ceremony's winner was misattributed (listed
 * "Sunrise: A Song of Two Humans" — a different, one-time-only category — at
 * year 1927, then placed the real winner, Wings, at 1928, its wrong release
 * year), and every comparison matched by lowercased title string rather than
 * movie ID, which silently fails for titles like "Birdman or (The Unexpected
 * Virtue of Ignorance)" that don't match a shortened display title exactly.
 *
 * This module fetches the real table once (it's small, ~100 rows, and public/
 * read-only reference data — no per-user join needed) and caches the promise
 * so every caller shares one network request regardless of how many components
 * use the hook.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import type { UserAward } from "@/hooks/useUserAwards";
import type { Movie } from "@/types/types";

export interface OfficialAwardWinner {
  year: number;
  category: string;
  filmTitle: string;
  movieId: string | null;
  matchStatus: "matched" | "unmatched" | "needs_review";
}

let cached: Promise<Map<number, OfficialAwardWinner>> | null = null;

async function loadOfficialAwardWinners(): Promise<Map<number, OfficialAwardWinner>> {
  const { data, error } = await supabase
    .from("official_award_winners")
    .select("year, category, film_title, movie_id, match_status")
    .eq("category", "best-picture");

  if (error) {
    console.warn("[officialAwardWinners] fetch failed:", error.message);
    cached = null; // allow retry on next call rather than caching a failure
    return new Map<number, OfficialAwardWinner>();
  }

  const map = new Map<number, OfficialAwardWinner>();
  for (const row of data ?? []) {
    map.set(row.year, {
      year: row.year,
      category: row.category,
      filmTitle: row.film_title,
      movieId: row.movie_id,
      matchStatus: row.match_status as OfficialAwardWinner["matchStatus"],
    });
  }
  return map;
}

export function fetchOfficialAwardWinners(): Promise<Map<number, OfficialAwardWinner>> {
  if (!cached) {
    cached = loadOfficialAwardWinners();
  }
  return cached;
}

export function useOfficialAwardWinners(): {
  winners: Map<number, OfficialAwardWinner>;
  loading: boolean;
} {
  const [winners, setWinners] = useState<Map<number, OfficialAwardWinner>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchOfficialAwardWinners().then((map) => {
      if (!cancelled) {
        setWinners(map);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { winners, loading };
}

export type AcademyStatus = "upheld" | "reawarded" | "unscreened";

export interface AcademyStatusResult {
  status: AcademyStatus;
  intensity?: "mild" | "loud"; // only set when status === "reawarded"
  officialTitle: string;
}

/**
 * Three-state comparison: Upheld / Reawarded / Unscreened. Gated on a set
 * ballot (5+ nominees AND an explicit winner) — thin/unset years return null,
 * per Law 3 (ballots must form, never appear) applied to this comparison too.
 */
export function getAcademyStatus({
  year,
  existingAward,
  liveNomineeCount,
  yearMovies,
  winners,
}: {
  year: number;
  existingAward: UserAward | null;
  liveNomineeCount: number;
  yearMovies: Movie[]; // movies for this release year, each with rankings[0] populated
  winners: Map<number, OfficialAwardWinner>;
}): AcademyStatusResult | null {
  const hasSetBallot = liveNomineeCount >= 5 && existingAward?.winnerId != null;
  if (!hasSetBallot) return null;

  const official = winners.get(year);
  if (!official || official.matchStatus !== "matched" || !official.movieId) return null;

  if (String(official.movieId) === String(existingAward!.winnerId)) {
    return { status: "upheld", officialTitle: official.filmTitle };
  }

  const officialMovie = yearMovies.find((m) => String(m.id) === String(official.movieId));
  const officialRating = officialMovie?.rankings?.[0]?.ranking;
  if (officialMovie == null || officialRating == null) {
    return { status: "unscreened", officialTitle: official.filmTitle };
  }

  const nomineeIds = new Set((existingAward!.nomineeIds ?? []).map(String));
  const intensity = nomineeIds.has(String(official.movieId)) ? "mild" : "loud";
  return { status: "reawarded", intensity, officialTitle: official.filmTitle };
}

/**
 * Simple ID-first, title-fallback comparison for message-building call sites
 * that only need "did this movie match the Academy's pick" (not the full
 * three-state model) — e.g. the toast copy shown right after creating an award.
 */
export function getAcademyContextMessage(
  movieId: string | number | null | undefined,
  movieTitle: string,
  year: number,
  winners: Map<number, OfficialAwardWinner>
): { message: string; agreedWithAcademy: boolean } {
  const official = winners.get(year);

  if (!official) {
    return {
      message: `You've chosen ${movieTitle} as Best Picture of ${year}.`,
      agreedWithAcademy: false,
    };
  }

  const agreedWithAcademy =
    official.movieId != null && movieId != null
      ? String(official.movieId) === String(movieId)
      : official.filmTitle.toLowerCase() === movieTitle.toLowerCase();

  if (agreedWithAcademy) {
    return { message: "You agree with the Academy!", agreedWithAcademy: true };
  }
  return {
    message: `The Academy picked ${official.filmTitle} instead.`,
    agreedWithAcademy: false,
  };
}
