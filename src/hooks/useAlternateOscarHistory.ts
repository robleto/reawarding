"use client";

import { useMemo } from "react";
import type { Movie } from "@/types/types";
import { useUserAwards } from "@/hooks/useUserAwards";
import { useOfficialAwardWinners } from "@/data/officialAwardWinners";
import {
  computeAlternateOscarHistory,
  type AlternateOscarHistorySummary,
  type ControversialCall,
  type DecadeStat,
} from "@/utils/alternateOscarHistory";

export type { ControversialCall, DecadeStat, AlternateOscarHistorySummary };

/**
 * useAlternateOscarHistory — client-side wrapper around
 * computeAlternateOscarHistory (src/utils/alternateOscarHistory.ts) for
 * callers that already have `movies` loaded. The homepage panel itself no
 * longer uses this — it fetches the server-gated /api/alternate-oscar-history
 * route instead, so the real aggregate never reaches a non-premium client
 * (see PAY-2 in docs/audits/2026-08-21-launch-readiness.md). Kept for any
 * other consumer that only needs the rollup for an already-premium, already-
 * loaded `movies` array.
 */
export function useAlternateOscarHistory(
  movies: Movie[]
): AlternateOscarHistorySummary & { loading: boolean } {
  const { awards, loading: awardsLoading } = useUserAwards();
  const { winners, loading: winnersLoading } = useOfficialAwardWinners();

  return useMemo(
    () => ({
      ...computeAlternateOscarHistory(movies, awards, winners),
      loading: awardsLoading || winnersLoading,
    }),
    [movies, awards, winners, awardsLoading, winnersLoading]
  );
}
