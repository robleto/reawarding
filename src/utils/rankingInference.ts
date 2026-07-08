/**
 * Ranking Inference — additive-only auto-ranking from award creation.
 *
 * When an award is created via "I know what should've won" (seed_pick),
 * auto-set rankings: winner gets 10, nominees get 9 descending (floor at 7).
 *
 * CRITICAL RULE: Inference is additive, never destructive.
 * Only set a ranking if no ranking currently exists for that movie.
 * If a user already rated a movie 8, don't overwrite it to 10.
 */

interface InferredRanking {
  movieId: string;
  ranking: number;
}

/**
 * Calculate inferred rankings from an award's winner + nominees.
 * Returns only movies that should receive a NEW ranking.
 *
 * @param winnerId - The movie ID of the winner
 * @param nomineeIds - All nominee IDs (including the winner)
 * @param existingRankings - Map of movieId → current ranking (or null/undefined if unranked)
 */
export function inferRankingsFromAward(
  winnerId: string,
  nomineeIds: string[],
  existingRankings: Record<string, number | null | undefined>
): InferredRanking[] {
  const inferred: InferredRanking[] = [];

  // Winner gets 10 — only if unranked
  if (!hasExistingRanking(winnerId, existingRankings)) {
    inferred.push({ movieId: winnerId, ranking: 10 });
  }

  // Nominees (excluding winner) get 9 descending, floor at 7
  const otherNominees = nomineeIds.filter((id) => id !== winnerId);
  let score = 9;
  for (const id of otherNominees) {
    if (!hasExistingRanking(id, existingRankings)) {
      inferred.push({ movieId: id, ranking: Math.max(score, 7) });
    }
    score--;
  }

  return inferred;
}

function hasExistingRanking(
  movieId: string,
  existingRankings: Record<string, number | null | undefined>
): boolean {
  const current = existingRankings[movieId];
  return current !== null && current !== undefined && current > 0;
}
