"use client";

import { useRef, useCallback } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";
import { inferRankingsFromAward } from "@/utils/rankingInference";
import { getContextMessage } from "@/data/bestPictureWinners";

/**
 * Award creation result returned to the UI.
 */
export interface AwardResult {
  success: boolean;
  year: number;
  winnerId: number;
  nomineeIds: number[];
  contextMessage: string;
  agreedWithAcademy: boolean;
  source: "seed_pick" | "ranking_calc" | "manual";
  error?: string;
}

interface LastMutation {
  year: number;
  winnerId: number;
  timestamp: number;
}

const DEDUP_WINDOW_MS = 2000;

/**
 * useCreateAward — single pathway for all award creation surfaces.
 *
 * Handles:
 * - Opinion-first picks (search, starter, year grid) via createAward()
 * - Assembly mode (rate & assemble) via createFromRatings()
 * - Existing award merge (new winner, preserve nominees)
 * - Guest mode (Zustand store) and authenticated mode (POST /api/awards)
 * - Idempotency (2s dedup window)
 * - Ranking inference (additive-only, never destructive)
 * - Source + revision tracking
 */
export function useCreateAward() {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();
  const guestStore = useGuestRankingStore();
  const lastMutationRef = useRef<LastMutation | null>(null);
  const isGuest = !user;

  /**
   * Check if a mutation is a duplicate (same year + winner within 2s).
   */
  const isDuplicate = useCallback((year: number, winnerId: number): boolean => {
    const last = lastMutationRef.current;
    if (!last) return false;
    return (
      last.year === year &&
      last.winnerId === winnerId &&
      Date.now() - last.timestamp < DEDUP_WINDOW_MS
    );
  }, []);

  /**
   * Record a mutation for dedup tracking.
   */
  const recordMutation = useCallback((year: number, winnerId: number) => {
    lastMutationRef.current = { year, winnerId, timestamp: Date.now() };
  }, []);

  /**
   * Get existing rankings for a set of movie IDs (for additive inference).
   */
  const getExistingRankings = useCallback(
    (movieIds: number[]): Record<number, number | null | undefined> => {
      const result: Record<number, number | null | undefined> = {};
      for (const id of movieIds) {
        if (isGuest) {
          const guestRanking = guestStore.getRanking(id);
          result[id] = guestRanking?.ranking;
        }
        // For authenticated users, we'd need to check the movies array
        // This will be populated by the caller if needed
      }
      return result;
    },
    [isGuest, guestStore]
  );

  /**
   * Apply inferred rankings (additive only).
   */
  const applyInferredRankings = useCallback(
    async (
      winnerId: number,
      nomineeIds: number[],
      existingRankings: Record<number, number | null | undefined>
    ) => {
      try {
        const inferred = inferRankingsFromAward(winnerId, nomineeIds, existingRankings);
        if (inferred.length === 0) return;

        if (isGuest) {
          for (const { movieId, ranking } of inferred) {
            guestStore.updateRanking(movieId, { ranking, seenIt: true });
          }
        } else {
          // For authenticated users, upsert rankings via Supabase
          const rankingsToUpsert = inferred.map(({ movieId, ranking }) => ({
            user_id: user!.id,
            movie_id: movieId,
            ranking,
            seen_it: true,
          }));

          const { error } = await supabase
            .from("rankings")
            .upsert(rankingsToUpsert, { onConflict: "user_id,movie_id", ignoreDuplicates: true });

          if (error) {
            // Ranking inference failure is non-blocking — log and continue
            console.warn("[useCreateAward] Ranking inference failed:", error.message);
          }
        }
      } catch (err) {
        // Ranking inference failure must NOT block the award
        console.warn("[useCreateAward] Ranking inference error:", err);
      }
    },
    [isGuest, guestStore, supabase, user]
  );

  /**
   * createAward — opinion-first path.
   * Single-movie pick: the movie becomes winner and sole nominee.
   * If award already exists for this year: set new winner, merge nominees.
   */
  const createAward = useCallback(
    async (
      movie: Pick<Movie, "id" | "title" | "release_year">,
      existingRankingsMap?: Record<number, number | null | undefined>
    ): Promise<AwardResult> => {
      const year = movie.release_year;
      const winnerId = movie.id;

      // Idempotency check
      if (isDuplicate(year, winnerId)) {
        const context = getContextMessage(movie.title, year);
        return {
          success: true,
          year,
          winnerId,
          nomineeIds: [winnerId],
          contextMessage: context.message,
          agreedWithAcademy: context.agreedWithAcademy,
          source: "seed_pick",
        };
      }

      recordMutation(year, winnerId);

      // Check if award already exists for this year — merge nominees
      let nomineeIds: number[];
      if (isGuest) {
        const existing = guestStore.getAward(year);
        if (existing) {
          // Merge: keep existing nominees, add new winner if not present
          const existingNominees = existing.nomineeIds.filter((id) => id !== winnerId);
          nomineeIds = [winnerId, ...existingNominees];
        } else {
          nomineeIds = [winnerId];
        }
      } else {
        // Check server for existing award
        try {
          const res = await fetch(`/api/awards?year=${year}&category=best-picture`);
          const data = await res.json();
          if (data.nominations?.nominee_ids?.length > 0) {
            const existingNominees = (data.nominations.nominee_ids as number[]).filter(
              (id: number) => id !== winnerId
            );
            nomineeIds = [winnerId, ...existingNominees];
          } else {
            nomineeIds = [winnerId];
          }
        } catch {
          nomineeIds = [winnerId];
        }
      }

      // Cap at 10 nominees
      nomineeIds = nomineeIds.slice(0, 10);

      // Optimistic: update local state immediately
      if (isGuest) {
        guestStore.setAward(year, winnerId, nomineeIds, "seed_pick");
      }

      // Persist to server (authenticated)
      if (!isGuest) {
        try {
          const res = await fetch("/api/awards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              year,
              category: "best-picture",
              nominee_ids: nomineeIds,
              winner_id: winnerId,
            }),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error("[useCreateAward] API error:", errorData);
            return {
              success: false,
              year,
              winnerId,
              nomineeIds,
              contextMessage: "",
              agreedWithAcademy: false,
              source: "seed_pick",
              error: "Couldn't save award. Try again.",
            };
          }
        } catch (err) {
          console.error("[useCreateAward] Network error:", err);
          return {
            success: false,
            year,
            winnerId,
            nomineeIds,
            contextMessage: "",
            agreedWithAcademy: false,
            source: "seed_pick",
            error: "Couldn't save award. Try again.",
          };
        }
      }

      // Apply ranking inference (additive, non-blocking)
      const rankings = existingRankingsMap ?? getExistingRankings(nomineeIds);
      await applyInferredRankings(winnerId, nomineeIds, rankings);

      const context = getContextMessage(movie.title, year);

      return {
        success: true,
        year,
        winnerId,
        nomineeIds,
        contextMessage: context.message,
        agreedWithAcademy: context.agreedWithAcademy,
        source: "seed_pick",
      };
    },
    [
      isDuplicate,
      recordMutation,
      isGuest,
      guestStore,
      getExistingRankings,
      applyInferredRankings,
    ]
  );

  /**
   * createFromRatings — assembly mode.
   * Takes pre-computed nominees + winner from the rating assembly.
   */
  const createFromRatings = useCallback(
    async (
      year: number,
      nominees: Pick<Movie, "id" | "title">[],
      winner: Pick<Movie, "id" | "title">,
      existingRankingsMap?: Record<number, number | null | undefined>
    ): Promise<AwardResult> => {
      const winnerId = winner.id;
      const nomineeIds = nominees.map((n) => n.id);

      // Idempotency check
      if (isDuplicate(year, winnerId)) {
        const context = getContextMessage(winner.title, year);
        return {
          success: true,
          year,
          winnerId,
          nomineeIds,
          contextMessage: context.message,
          agreedWithAcademy: context.agreedWithAcademy,
          source: "ranking_calc",
        };
      }

      recordMutation(year, winnerId);

      // Ensure winner is in nominees
      if (!nomineeIds.includes(winnerId)) {
        nomineeIds.unshift(winnerId);
      }

      // Optimistic: update local state
      if (isGuest) {
        guestStore.setAward(year, winnerId, nomineeIds, "ranking_calc");
      }

      // Persist to server
      if (!isGuest) {
        try {
          const res = await fetch("/api/awards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              year,
              category: "best-picture",
              nominee_ids: nomineeIds,
              winner_id: winnerId,
            }),
          });

          if (!res.ok) {
            // Rollback guest state on failure
            if (isGuest) {
              guestStore.removeAward(year);
            }
            return {
              success: false,
              year,
              winnerId,
              nomineeIds,
              contextMessage: "",
              agreedWithAcademy: false,
              source: "ranking_calc",
              error: "Couldn't save award. Try again.",
            };
          }
        } catch (err) {
          console.error("[useCreateAward] Network error:", err);
          return {
            success: false,
            year,
            winnerId,
            nomineeIds,
            contextMessage: "",
            agreedWithAcademy: false,
            source: "ranking_calc",
            error: "Couldn't save award. Try again.",
          };
        }
      }

      // No ranking inference for assembly mode — rankings already exist
      const context = getContextMessage(winner.title, year);

      return {
        success: true,
        year,
        winnerId,
        nomineeIds,
        contextMessage: context.message,
        agreedWithAcademy: context.agreedWithAcademy,
        source: "ranking_calc",
      };
    },
    [isDuplicate, recordMutation, isGuest, guestStore]
  );

  return { createAward, createFromRatings, isGuest };
}
