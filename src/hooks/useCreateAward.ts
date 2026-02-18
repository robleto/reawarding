"use client";

import { useRef, useCallback } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";
import { inferRankingsFromAward } from "@/utils/rankingInference";
import { getContextMessage } from "@/data/bestPictureWinners";

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

interface ExistingAwardRecord {
  nomineeIds: number[];
  winnerId: number | null;
  revisionNumber: number;
}

interface LastMutation {
  actorKey: string;
  signature: string;
  timestamp: number;
  result: AwardResult;
}

const DEDUP_WINDOW_MS = 2000;

export function useCreateAward() {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();
  const guestStore = useGuestRankingStore();
  const lastMutationRef = useRef<LastMutation | null>(null);
  const guestSessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}`
  );
  /** Per-year mutex: prevents concurrent double-click from bypassing dedup. */
  const yearLocksRef = useRef<Map<number, Promise<AwardResult>>>(new Map());
  const isGuest = !user;

  const actorKey = user?.id ?? guestSessionIdRef.current;

  const buildSignature = useCallback(
    (
      year: number,
      winnerId: number,
      nomineeIds: number[],
      source: AwardResult["source"]
    ) => {
      const normalizedNominees = [...new Set(nomineeIds)].sort((a, b) => a - b).join(",");
      return `${year}|${winnerId}|${normalizedNominees}|${source}`;
    },
    []
  );

  const getDuplicateResult = useCallback((signature: string): AwardResult | null => {
    const last = lastMutationRef.current;
    if (!last) return null;
    if (last.actorKey !== actorKey) return null;
    if (last.signature !== signature) return null;
    if (Date.now() - last.timestamp >= DEDUP_WINDOW_MS) return null;
    return last.result;
  }, [actorKey]);

  const recordMutation = useCallback((signature: string, result: AwardResult) => {
    lastMutationRef.current = {
      actorKey,
      signature,
      timestamp: Date.now(),
      result,
    };
  }, [actorKey]);

  const getExistingRankings = useCallback(
    (movieIds: number[]): Record<number, number | null | undefined> => {
      const result: Record<number, number | null | undefined> = {};
      for (const id of movieIds) {
        if (!isGuest) continue;
        const guestRanking = guestStore.getRanking(id);
        result[id] = guestRanking?.ranking;
      }
      return result;
    },
    [isGuest, guestStore]
  );

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
          return;
        }

        const rankingsToUpsert = inferred.map(({ movieId, ranking }) => ({
          user_id: user!.id,
          movie_id: movieId,
          ranking,
          seen_it: true,
        }));

        const { error } = await supabase
          .from("rankings")
          .upsert(rankingsToUpsert, {
            onConflict: "user_id,movie_id",
            ignoreDuplicates: true,
          });

        if (error) {
          console.warn("[useCreateAward] Ranking inference failed:", error.message);
        }
      } catch (err) {
        console.warn("[useCreateAward] Ranking inference error:", err);
      }
    },
    [isGuest, guestStore, supabase, user]
  );

  const fetchExistingAward = useCallback(
    async (year: number): Promise<ExistingAwardRecord | null> => {
      if (isGuest) {
        const guest = guestStore.getAward(year);
        if (!guest) return null;
        return {
          nomineeIds: guest.nomineeIds,
          winnerId: guest.winnerId,
          revisionNumber: guest.revisionNumber,
        };
      }

      try {
        const res = await fetch(`/api/awards?year=${year}&category=best-picture`);
        if (!res.ok) return null;
        const data = await res.json();
        const nominations = data?.nominations;
        if (!nominations) return null;
        const nomineeIds = Array.isArray(nominations.nominee_ids) ? nominations.nominee_ids : [];
        const winnerId = nominations.winner_id ?? null;
        const revisionNumber =
          typeof nominations.revision_number === "number" ? nominations.revision_number : 0;
        if (nomineeIds.length === 0 && winnerId === null) return null;
        return { nomineeIds, winnerId, revisionNumber };
      } catch {
        return null;
      }
    },
    [isGuest, guestStore]
  );

  const persistAward = useCallback(
    async (
      year: number,
      nomineeIds: number[],
      winnerId: number,
      _source: AwardResult["source"],
      _revisionNumber: number
    ): Promise<boolean> => {
      if (isGuest) return true;

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
          console.warn("[useCreateAward] API request failed", {
            status: res.status,
            statusText: res.statusText,
            errorData,
          });
          return false;
        }

        return true;
      } catch (err) {
        console.error("[useCreateAward] Network error:", err);
        return false;
      }
    },
    [isGuest]
  );

  /** Inner implementation — must only be called through the mutex wrapper. */
  const createAwardInner = useCallback(
    async (
      movie: Pick<Movie, "id" | "title" | "release_year">,
      existingRankingsMap?: Record<number, number | null | undefined>
    ): Promise<AwardResult> => {
      const source: AwardResult["source"] = "seed_pick";
      const year = movie.release_year;

      const existing = await fetchExistingAward(year);

      // If an award already exists with a winner, preserve that winner
      // and add the new movie as a nominee instead of overwriting.
      const winnerId = existing?.winnerId ?? movie.id;
      const mergedNominees = existing
        ? [...new Set([winnerId, movie.id, ...existing.nomineeIds])].slice(0, 10)
        : [movie.id];
      const revisionNumber = (existing?.revisionNumber ?? 0) + 1;

      const signature = buildSignature(year, winnerId, mergedNominees, source);
      const duplicate = getDuplicateResult(signature);
      if (duplicate) return duplicate;

      const previousGuestAward = isGuest ? guestStore.getAward(year) : null;

      if (isGuest) {
        guestStore.setAward(year, winnerId, mergedNominees, source);
      }

      const persisted = await persistAward(year, mergedNominees, winnerId, source, revisionNumber);
      if (!persisted) {
        if (isGuest) {
          if (previousGuestAward) {
            guestStore.setAward(
              year,
              previousGuestAward.winnerId,
              previousGuestAward.nomineeIds,
              previousGuestAward.source
            );
          } else {
            guestStore.removeAward(year);
          }
        }

        const failed: AwardResult = {
          success: false,
          year,
          winnerId,
          nomineeIds: mergedNominees,
          contextMessage: "",
          agreedWithAcademy: false,
          source,
          error: "Couldn't save award. Try again.",
        };
        recordMutation(signature, failed);
        return failed;
      }

      const rankings = existingRankingsMap ?? getExistingRankings(mergedNominees);
      await applyInferredRankings(winnerId, mergedNominees, rankings);

      const context = getContextMessage(movie.title, year);
      const success: AwardResult = {
        success: true,
        year,
        winnerId,
        nomineeIds: mergedNominees,
        contextMessage: context.message,
        agreedWithAcademy: context.agreedWithAcademy,
        source,
      };
      recordMutation(signature, success);
      return success;
    },
    [
      fetchExistingAward,
      buildSignature,
      getDuplicateResult,
      isGuest,
      guestStore,
      persistAward,
      getExistingRankings,
      applyInferredRankings,
      recordMutation,
    ]
  );

  /**
   * Public createAward — serialised per year via mutex.
   * If two rapid clicks fire for the same year, the second waits for the
   * first to finish and then hits the dedup window, returning the cached result.
   */
  const createAward = useCallback(
    (
      movie: Pick<Movie, "id" | "title" | "release_year">,
      existingRankingsMap?: Record<number, number | null | undefined>
    ): Promise<AwardResult> => {
      const year = movie.release_year;
      const pending = yearLocksRef.current.get(year);
      const execute = async (): Promise<AwardResult> => {
        if (pending) await pending.catch(() => {});
        return createAwardInner(movie, existingRankingsMap);
      };
      const promise = execute().finally(() => {
        // Release lock only if this is still the active promise for this year
        if (yearLocksRef.current.get(year) === promise) {
          yearLocksRef.current.delete(year);
        }
      });
      yearLocksRef.current.set(year, promise);
      return promise;
    },
    [createAwardInner]
  );

  /** Inner implementation — must only be called through the mutex wrapper. */
  const createFromRatingsInner = useCallback(
    async (
      year: number,
      nominees: Pick<Movie, "id" | "title">[],
      winner: Pick<Movie, "id" | "title">,
      _existingRankingsMap?: Record<number, number | null | undefined>
    ): Promise<AwardResult> => {
      const source: AwardResult["source"] = "ranking_calc";
      const winnerId = winner.id;
      const nomineeIds = [...new Set([winnerId, ...nominees.map((n) => n.id)])].slice(0, 10);

      const existing = await fetchExistingAward(year);
      const revisionNumber = (existing?.revisionNumber ?? 0) + 1;

      const signature = buildSignature(year, winnerId, nomineeIds, source);
      const duplicate = getDuplicateResult(signature);
      if (duplicate) return duplicate;

      const previousGuestAward = isGuest ? guestStore.getAward(year) : null;

      if (isGuest) {
        guestStore.setAward(year, winnerId, nomineeIds, source);
      }

      const persisted = await persistAward(year, nomineeIds, winnerId, source, revisionNumber);
      if (!persisted) {
        if (isGuest) {
          if (previousGuestAward) {
            guestStore.setAward(
              year,
              previousGuestAward.winnerId,
              previousGuestAward.nomineeIds,
              previousGuestAward.source
            );
          } else {
            guestStore.removeAward(year);
          }
        }

        const failed: AwardResult = {
          success: false,
          year,
          winnerId,
          nomineeIds,
          contextMessage: "",
          agreedWithAcademy: false,
          source,
          error: "Couldn't save award. Try again.",
        };
        recordMutation(signature, failed);
        return failed;
      }

      const context = getContextMessage(winner.title, year);
      const success: AwardResult = {
        success: true,
        year,
        winnerId,
        nomineeIds,
        contextMessage: context.message,
        agreedWithAcademy: context.agreedWithAcademy,
        source,
      };
      recordMutation(signature, success);
      return success;
    },
    [
      fetchExistingAward,
      buildSignature,
      getDuplicateResult,
      isGuest,
      guestStore,
      persistAward,
      recordMutation,
    ]
  );

  /**
   * Public createFromRatings — serialised per year via the same mutex.
   */
  const createFromRatings = useCallback(
    (
      year: number,
      nominees: Pick<Movie, "id" | "title">[],
      winner: Pick<Movie, "id" | "title">,
      existingRankingsMap?: Record<number, number | null | undefined>
    ): Promise<AwardResult> => {
      const pending = yearLocksRef.current.get(year);
      const execute = async (): Promise<AwardResult> => {
        if (pending) await pending.catch(() => {});
        return createFromRatingsInner(year, nominees, winner, existingRankingsMap);
      };
      const promise = execute().finally(() => {
        if (yearLocksRef.current.get(year) === promise) {
          yearLocksRef.current.delete(year);
        }
      });
      yearLocksRef.current.set(year, promise);
      return promise;
    },
    [createFromRatingsInner]
  );

  return { createAward, createFromRatings, isGuest };
}
