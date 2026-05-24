// Predicate for "should this film surface as a discovery candidate on year-scoped
// onboarding / explorer surfaces?" Library / search / curated-list surfaces are
// intentionally exempt — there the user has already picked their own scope.

import type { Movie } from "@/types/types";

export const MIN_VOTE_COUNT_FOR_CANDIDATE = 200;

type CandidateInput = Pick<Movie, "vote_count" | "rankings">;

export function isCanonicalCandidate(m: CandidateInput): boolean {
  // Always keep films the user has already engaged with so re-rating /
  // re-nominating works regardless of vote-count thresholds.
  const r = m.rankings?.[0];
  if (r && (r.seen_it === true || typeof r.ranking === "number")) return true;
  // vote_count === 0 is treated as "unbacked" (older catalogue entries often
  // lack vote data) and given the benefit of the doubt. Positive-but-small
  // counts mark truly obscure long-tail releases.
  const vc = m.vote_count ?? 0;
  return vc === 0 || vc >= MIN_VOTE_COUNT_FOR_CANDIDATE;
}
