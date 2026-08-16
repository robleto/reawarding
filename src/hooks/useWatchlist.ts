"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import { ensureUserWatchlist } from "@/utils/watchlist";

export interface WatchlistMutationResult {
  success: boolean;
  error?: string;
}

export function useWatchlist(userId: string | null) {
  const supabase = useSupabaseClient<Database>();
  const [watchlistMovieIds, setWatchlistMovieIds] = useState<Set<string>>(new Set());
  const [watchlistListId, setWatchlistListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listIdRef = useRef<string | null>(null);
  // Mirrors watchlistMovieIds synchronously so toggle/removeIfWatched never read a
  // stale value out of the React state closure (setState is not guaranteed to be
  // applied before the next call reads it back).
  const watchlistRef = useRef<Set<string>>(new Set());
  /**
   * Per-movie mutex: if toggle/removeIfWatched are invoked twice in quick succession
   * for the same movie (e.g. a double-tap) before React re-renders, the second call
   * waits for the first to fully resolve (including any rollback) before computing
   * its own on/off decision, instead of both computing from the same stale state and
   * issuing the same insert/delete twice. Shared between toggle and removeIfWatched
   * since both mutate the same per-movie membership. Same shape as the per-year
   * mutex in useCreateAward.ts.
   */
  const movieLocksRef = useRef<Map<string, Promise<WatchlistMutationResult>>>(new Map());

  useEffect(() => {
    if (!userId) {
      watchlistRef.current = new Set();
      setWatchlistMovieIds(new Set());
      setWatchlistListId(null);
      listIdRef.current = null;
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const listId = await ensureUserWatchlist(supabase, userId!);
        if (cancelled || !listId) return;
        listIdRef.current = listId;
        setWatchlistListId(listId);
        const { data, error: selectError } = await supabase
          .from("movie_list_items")
          .select("movie_id")
          .eq("list_id", listId);
        if (cancelled) return;
        if (selectError) {
          setError("Couldn't load your watchlist.");
          return;
        }
        if (data) {
          const ids = new Set(data.map((row) => row.movie_id as string));
          watchlistRef.current = ids;
          setWatchlistMovieIds(ids);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, supabase]);

  const toggleInner = useCallback(async (movieId: string): Promise<WatchlistMutationResult> => {
    if (!userId || !listIdRef.current) {
      return { success: false, error: "You need to be signed in to use the watchlist." };
    }
    const listId = listIdRef.current;
    const prev = watchlistRef.current;
    const wasOnWatchlist = prev.has(movieId);
    const next = new Set(prev);
    if (wasOnWatchlist) next.delete(movieId); else next.add(movieId);
    watchlistRef.current = next;
    setWatchlistMovieIds(next);

    const { error: opError } = wasOnWatchlist
      ? await supabase.from("movie_list_items").delete().eq("list_id", listId).eq("movie_id", movieId)
      : await supabase.from("movie_list_items").insert({ list_id: listId, movie_id: movieId, ranking: null });

    if (opError) {
      // Roll back — but only THIS movie's membership, inverted off the
      // CURRENT ref rather than restoring the whole `prev` snapshot. Other
      // movie ids are mutated concurrently (e.g. the bulk removeIfWatched
      // forEach loops in the watchlist page and WatchlistMovieRow), each
      // under its own per-movie lock, so `prev` can already be stale by the
      // time this await resolves — restoring it wholesale would clobber
      // sibling movies that committed successfully in the meantime.
      const reverted = new Set(watchlistRef.current);
      if (wasOnWatchlist) reverted.add(movieId); else reverted.delete(movieId);
      watchlistRef.current = reverted;
      setWatchlistMovieIds(reverted);
      const message = "Couldn't update your watchlist. Please try again.";
      console.warn("[useWatchlist] toggle failed:", opError.message);
      return { success: false, error: message };
    }
    return { success: true };
  }, [userId, supabase]);

  // Call this when a film is marked as watched — removes it from the watchlist automatically
  const removeIfWatchedInner = useCallback(async (movieId: string): Promise<WatchlistMutationResult> => {
    const listId = listIdRef.current;
    const prev = watchlistRef.current;
    if (!listId || !prev.has(movieId)) return { success: true };

    const next = new Set(prev);
    next.delete(movieId);
    watchlistRef.current = next;
    setWatchlistMovieIds(next);

    const { error: opError } = await supabase
      .from("movie_list_items")
      .delete()
      .eq("list_id", listId)
      .eq("movie_id", movieId);

    if (opError) {
      // Same per-movie revert as toggleInner above — re-add only this
      // movie id off the CURRENT ref, not the pre-call `prev` snapshot,
      // so a concurrent sibling removal (this function is called in a
      // forEach loop, once per movie, each under its own lock) isn't
      // clobbered by restoring stale whole-set state.
      const reverted = new Set(watchlistRef.current);
      reverted.add(movieId);
      watchlistRef.current = reverted;
      setWatchlistMovieIds(reverted);
      const message = "Couldn't remove from watchlist. Please try again.";
      console.warn("[useWatchlist] removeIfWatched failed:", opError.message);
      return { success: false, error: message };
    }
    return { success: true };
  }, [supabase]);

  /**
   * Serialises per-movie mutations through movieLocksRef so a rapid repeated
   * invocation for the same movie always sees the result of the previous one
   * (including any rollback) before deciding what to do next.
   */
  const withMovieLock = useCallback(
    (movieId: string, run: (movieId: string) => Promise<WatchlistMutationResult>) => {
      const pending = movieLocksRef.current.get(movieId);
      const execute = async (): Promise<WatchlistMutationResult> => {
        if (pending) await pending.catch(() => {});
        return run(movieId);
      };
      const promise = execute().finally(() => {
        if (movieLocksRef.current.get(movieId) === promise) {
          movieLocksRef.current.delete(movieId);
        }
      });
      movieLocksRef.current.set(movieId, promise);
      return promise;
    },
    []
  );

  const toggle = useCallback(
    (movieId: string) => withMovieLock(movieId, toggleInner),
    [withMovieLock, toggleInner]
  );

  const removeIfWatched = useCallback(
    (movieId: string) => withMovieLock(movieId, removeIfWatchedInner),
    [withMovieLock, removeIfWatchedInner]
  );

  return { watchlistMovieIds, watchlistListId, loading, error, toggle, removeIfWatched };
}
