"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import { ensureUserWatchlist } from "@/utils/watchlist";

export function useWatchlist(userId: string | null) {
  const supabase = useSupabaseClient<Database>();
  const [watchlistMovieIds, setWatchlistMovieIds] = useState<Set<number>>(new Set());
  const [watchlistListId, setWatchlistListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const listIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setWatchlistMovieIds(new Set());
      setWatchlistListId(null);
      listIdRef.current = null;
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const listId = await ensureUserWatchlist(supabase, userId!);
        if (cancelled || !listId) return;
        listIdRef.current = listId;
        setWatchlistListId(listId);
        const { data } = await supabase
          .from("movie_list_items")
          .select("movie_id")
          .eq("list_id", listId);
        if (!cancelled && data) {
          setWatchlistMovieIds(new Set(data.map((row) => row.movie_id as number)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, supabase]);

  const toggle = useCallback(async (movieId: number) => {
    if (!userId || !listIdRef.current) return;
    const listId = listIdRef.current;
    const isOnWatchlist = watchlistMovieIds.has(movieId);
    setWatchlistMovieIds((prev) => {
      const next = new Set(prev);
      if (isOnWatchlist) next.delete(movieId); else next.add(movieId);
      return next;
    });
    if (isOnWatchlist) {
      await supabase.from("movie_list_items").delete().eq("list_id", listId).eq("movie_id", movieId);
    } else {
      await supabase.from("movie_list_items").insert({ list_id: listId, movie_id: movieId, ranking: null });
    }
  }, [userId, supabase, watchlistMovieIds]);

  // Call this when a film is marked as watched — removes it from the watchlist automatically
  const removeIfWatched = useCallback(async (movieId: number) => {
    if (!listIdRef.current || !watchlistMovieIds.has(movieId)) return;
    const listId = listIdRef.current;
    setWatchlistMovieIds((prev) => { const next = new Set(prev); next.delete(movieId); return next; });
    await supabase.from("movie_list_items").delete().eq("list_id", listId).eq("movie_id", movieId);
  }, [supabase, watchlistMovieIds]);

  return { watchlistMovieIds, watchlistListId, loading, toggle, removeIfWatched };
}
