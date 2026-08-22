import type { Movie } from "@/types/types";

/**
 * Which of a user's rated movies can even become a nominee in a given award
 * category — determined by what a film institutionally *is* (TMDB genre),
 * not by user taste tags (PRODUCT_DECISION_LOG.md, July 2026: "genre-based
 * official categories... map to real Academy categories by construction").
 * Best Picture has no genre gate — every rated film is eligible.
 */
export function isEligibleForCategory(movie: Movie, category: string): boolean {
  if (category === "best-picture") return true;
  if (category === "best-animated") return movie.genres?.includes("Animation") ?? false;
  return true;
}
