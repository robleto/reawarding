/**
 * Pure Academy-comparison logic — no React, no Supabase client of any kind —
 * split out of src/data/officialAwardWinners.ts (which also owns
 * fetchOfficialAwardWinners/useOfficialAwardWinners, both built on the
 * browser-only client in src/lib/supabaseBrowser.ts) so this logic can be
 * safely imported from server code (e.g.
 * src/app/api/alternate-oscar-history/route.ts) without dragging that
 * browser-only client into a server bundle. officialAwardWinners.ts re-
 * exports everything here for backward compatibility with existing client
 * call sites.
 */
import type { UserAward } from "@/utils/normalizeUserAward";
import type { Movie } from "@/types/types";

export interface OfficialAwardWinner {
  year: number;
  category: string;
  filmTitle: string;
  movieId: string | null;
  matchStatus: "matched" | "unmatched" | "needs_review";
}

export type AcademyStatus = "upheld" | "reawarded" | "unscreened";

export interface AcademyStatusResult {
  status: AcademyStatus;
  intensity?: "mild" | "loud"; // only set when status === "reawarded"
  officialTitle: string;
}

/**
 * Three-state comparison: Upheld / Reawarded / Unscreened. Gated only on a
 * winner existing for the year (explicit or the page's own computed
 * default — either way, it's already the winner being displayed) — not on
 * nominee count. A thin year the user will never fill to 5+ nominees (an
 * obscure year with only a handful of rated films) still has a real,
 * considered pick worth comparing; requiring a fuller ballot first just
 * hid the comparison for exactly the years least likely to ever clear that
 * bar. `liveNomineeCount` is unused now but kept in the signature — call
 * sites already compute and pass it, and it costs nothing to ignore.
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
  const hasWinner = existingAward?.winnerId != null;
  if (!hasWinner) return null;

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
