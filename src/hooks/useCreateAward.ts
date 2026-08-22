"use client";

import { useRef, useCallback } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";
import { inferRankingsFromAward } from "@/utils/rankingInference";
import { fetchOfficialAwardWinners, getAcademyContextMessage } from "@/data/officialAwardWinners";
import { generateUUID } from "@/utils/uuid";

export interface AwardResult {
  success: boolean;
  year: number;
  winnerId: string;
  nomineeIds: string[];
  contextMessage: string;
  agreedWithAcademy: boolean;
  /**
   * Only "seed_pick" is produced today. "ranking_calc" was emitted by a
   * createFromRatings() path that was removed — it took `year` independently
   * of the winner and only received the winner's id/title, so it structurally
   * could not verify the winner belonged to that year (the origin of at least
   * one award filed under the wrong year). The union members are retained
   * because persisted guest awards may still carry them.
   */
  source: "seed_pick" | "ranking_calc" | "manual";
  error?: string;
}

interface ExistingAwardRecord {
  nomineeIds: string[];
  winnerId: string | null;
  revisionNumber: number;
}

interface ExistingAwardLookup {
  award: ExistingAwardRecord | null;
  error?: string;
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
  const guestSessionIdRef = useRef<string>(generateUUID());
  /** Per-year-and-category mutex: prevents concurrent double-click from bypassing dedup. */
  const yearLocksRef = useRef<Map<string, Promise<AwardResult>>>(new Map());
  const isGuest = !user;

  const actorKey = user?.id ?? guestSessionIdRef.current;

  const buildSignature = useCallback(
    (
      year: number,
      category: string,
      winnerId: string,
      nomineeIds: string[],
      source: AwardResult["source"]
    ) => {
      const normalizedNominees = [...new Set(nomineeIds)].sort().join(",");
      return `${year}|${category}|${winnerId}|${normalizedNominees}|${source}`;
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
    async (movieIds: string[]): Promise<Record<string, number | null | undefined>> => {
      const result: Record<string, number | null | undefined> = {};

      if (isGuest) {
        for (const id of movieIds) {
          result[id] = guestStore.getRanking(id)?.ranking;
        }
        return result;
      }

      // Signed-in users used to get an empty map here, leaving `ignoreDuplicates`
      // in applyInferredRankings as the only guard against overwriting a real
      // rating. That guard is ON CONFLICT DO NOTHING, which also blocks rows
      // that already exist with a NULL ranking — so crowning a film that had an
      // empty rankings row (an old watchlist/seen entry) silently recorded no
      // opinion at all, leaving a winner with no rating behind it. Reading the
      // real rows lets inferRankingsFromAward do the filtering in JS, exactly
      // as it already does for guests, so those NULL rows can be filled while a
      // genuine rating is still never touched.
      if (!user || movieIds.length === 0) return result;

      const { data, error } = await supabase
        .from("rankings")
        .select("movie_id, ranking")
        .eq("user_id", user.id)
        .in("movie_id", movieIds);

      if (error) {
        console.warn("[useCreateAward] Existing-ranking lookup failed:", error.message);
        // Fail closed: mark every nominee as already rated so inference becomes
        // a no-op. Skipping the auto-rating is recoverable; overwriting a user's
        // real rating on the strength of an incomplete read is not.
        for (const id of movieIds) result[id] = 10;
        return result;
      }

      for (const row of data ?? []) {
        result[String(row.movie_id)] = row.ranking;
      }
      return result;
    },
    [isGuest, guestStore, supabase, user]
  );

  const applyInferredRankings = useCallback(
    async (
      winnerId: string,
      nomineeIds: string[],
      existingRankings: Record<string, number | null | undefined>
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

        // No ignoreDuplicates: inferRankingsFromAward has already dropped every
        // movie that carries a real rating, so anything still in this list is
        // either a brand-new row or an existing row with a NULL ranking that
        // should be filled. DO NOTHING here is what stranded the latter.
        const { error } = await supabase
          .from("rankings")
          .upsert(rankingsToUpsert, {
            onConflict: "user_id,movie_id",
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
    async (year: number, category: string): Promise<ExistingAwardLookup> => {
      if (isGuest) {
        // v1 simplification (see GuestAward in useGuestRankingStore.ts): guest
        // awards are keyed by year only, category always "best-picture" —
        // a non-best-picture category has no guest storage to read from.
        const guest = category === "best-picture" ? guestStore.getAward(year) : null;
        if (!guest) return { award: null };
        return {
          award: {
            nomineeIds: guest.nomineeIds,
            winnerId: guest.winnerId,
            revisionNumber: guest.revisionNumber,
          },
        };
      }

      try {
        const res = await fetch(`/api/awards?year=${year}&category=${category}`);
        if (res.status === 404) return { award: null };
        if (res.status === 401) {
          return { award: null, error: "Your session expired. Please sign in again." };
        }
        if (!res.ok) {
          return { award: null, error: "Couldn't verify your existing award. Try again." };
        }
        const data = await res.json();
        const nominations = data?.nominations;
        if (!nominations) return { award: null };
        const nomineeIds = Array.isArray(nominations.nominee_ids) ? nominations.nominee_ids : [];
        const winnerId = nominations.winner_id ?? null;
        const revisionNumber =
          typeof nominations.revision_number === "number" ? nominations.revision_number : 0;
        if (nomineeIds.length === 0 && winnerId === null) return { award: null };
        return { award: { nomineeIds, winnerId, revisionNumber } };
      } catch {
        return { award: null, error: "Couldn't verify your existing award. Try again." };
      }
    },
    [isGuest, guestStore]
  );

  const persistAward = useCallback(
    async (
      year: number,
      category: string,
      nomineeIds: string[],
      winnerId: string,
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
            category,
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
      existingRankingsMap?: Record<string, number | null | undefined>,
      category: string = "best-picture"
    ): Promise<AwardResult> => {
      const source: AwardResult["source"] = "seed_pick";
      const year = movie.release_year;

      // v1 simplification (see GuestAward in useGuestRankingStore.ts): guest
      // award storage only has a "best-picture" slot. Rather than silently
      // dropping a guest's non-best-picture pick, fail it explicitly so the
      // calling UI can react (e.g. prompt sign-in) instead of looking like a
      // successful nomination that then vanishes on refresh.
      if (isGuest && category !== "best-picture") {
        return {
          success: false,
          year,
          winnerId: movie.id,
          nomineeIds: [movie.id],
          contextMessage: "",
          agreedWithAcademy: false,
          source,
          error: "Sign in to build a ballot in this category.",
        };
      }

      const existingLookup = await fetchExistingAward(year, category);
      if (existingLookup.error) {
        const failed: AwardResult = {
          success: false,
          year,
          winnerId: movie.id,
          nomineeIds: [movie.id],
          contextMessage: "",
          agreedWithAcademy: false,
          source,
          error: existingLookup.error,
        };
        return failed;
      }
      const existing = existingLookup.award;

      // If an award already exists with a winner, preserve that winner
      // and add the new movie as a nominee instead of overwriting.
      const winnerId = existing?.winnerId ?? movie.id;
      const mergedNominees = existing
        ? [...new Set([winnerId, movie.id, ...existing.nomineeIds])].slice(0, 10)
        : [movie.id];
      const revisionNumber = (existing?.revisionNumber ?? 0) + 1;

      const signature = buildSignature(year, category, winnerId, mergedNominees, source);
      const duplicate = getDuplicateResult(signature);
      if (duplicate) return duplicate;

      // isGuest is already guaranteed category === "best-picture" here (see
      // the guard above), so the guest store's best-picture-only shape holds.
      const previousGuestAward = isGuest ? guestStore.getAward(year) : null;

      if (isGuest) {
        guestStore.setAward(year, winnerId, mergedNominees, source);
      }

      const persisted = await persistAward(year, category, mergedNominees, winnerId, source, revisionNumber);
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

      const rankings = existingRankingsMap ?? (await getExistingRankings(mergedNominees));
      await applyInferredRankings(winnerId, mergedNominees, rankings);

      const officialWinners = await fetchOfficialAwardWinners(category);
      const context = getAcademyContextMessage(movie.id, movie.title, year, officialWinners);
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
      existingRankingsMap?: Record<string, number | null | undefined>,
      category: string = "best-picture"
    ): Promise<AwardResult> => {
      const year = movie.release_year;
      const lockKey = `${year}:${category}`;
      const pending = yearLocksRef.current.get(lockKey);
      const execute = async (): Promise<AwardResult> => {
        if (pending) await pending.catch(() => {});
        return createAwardInner(movie, existingRankingsMap, category);
      };
      const promise = execute().finally(() => {
        // Release lock only if this is still the active promise for this year+category
        if (yearLocksRef.current.get(lockKey) === promise) {
          yearLocksRef.current.delete(lockKey);
        }
      });
      yearLocksRef.current.set(lockKey, promise);
      return promise;
    },
    [createAwardInner]
  );

  return { createAward, isGuest };
}
