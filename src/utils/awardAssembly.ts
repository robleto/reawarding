/**
 * Award Assembly — derives nominees + winner from a user's per-year rankings.
 *
 * Extracted from page.tsx `getAwardsDataForYear`. Used by YearExplorer
 * assembly mode and by the existing homepage for auto-assembled awards.
 */

import type { Movie } from "@/types/types";

export interface AssembledAward {
  rankedCount: number;
  /** True when the user has enough rated movies to generate a meaningful award */
  unlocked: boolean;
  sortedMovies: Movie[];
  nominees: Movie[];
  winner: Movie | null;
}

/**
 * Assemble an award from a set of movies for a specific year.
 *
 * @param movies - All movies the user has access to (pre-filtered or not)
 * @param year - The release year to assemble for
 * @param unlockThreshold - Minimum ranked movies needed (default: 5)
 */
export function getAwardsDataForYear(
  movies: Movie[],
  year: number,
  unlockThreshold = 5
): AssembledAward {
  const getYearFromMovie = (movie: Movie): number | null => {
    if (typeof movie.release_year === "number") return movie.release_year;
    if (!movie.release_year) return null;
    const parsed = new Date(String(movie.release_year)).getFullYear();
    return Number.isFinite(parsed) ? parsed : null;
  };

  const rankedMoviesForYear = movies.filter((movie) => {
    const releaseYear = getYearFromMovie(movie);
    const ranking = movie.rankings?.[0]?.ranking;
    return releaseYear === year && typeof ranking === "number" && ranking > 0;
  });

  const sortedMovies = [...rankedMoviesForYear].sort(
    (a, b) => (b.rankings?.[0]?.ranking ?? 0) - (a.rankings?.[0]?.ranking ?? 0)
  );

  // Winner is the highest-rated movie regardless of how `nominees` below
  // gets displayed/sorted — never derive it from nominees[0].
  const winner = sortedMovies[0] ?? null;

  // Display order defaults to alphabetical; rating only determines who
  // qualifies as a nominee (7+) and the top-10 cutoff.
  const nominees = sortedMovies
    .filter((movie) => (movie.rankings?.[0]?.ranking ?? 0) >= 7)
    .slice(0, 10)
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    rankedCount: rankedMoviesForYear.length,
    unlocked: rankedMoviesForYear.length >= unlockThreshold,
    sortedMovies,
    nominees,
    winner,
  };
}
