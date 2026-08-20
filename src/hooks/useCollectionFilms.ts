"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import type { Movie } from "@/types/types";

/**
 * The canonical film list for a collection, with the given user's own
 * seen/ranking state overlaid — never the other way around. The bug this
 * fixes: fetching the canonical list by filtering an already-user-scoped
 * movies array (what /films/collections/[slug]/page.tsx and the old
 * /[username]/collections/[tag]/page.tsx both did) silently drops any film
 * the user hasn't rated yet, since it was never in that array to begin
 * with. Here the canonical list always comes straight from
 * film_collection_items + an unscoped movies query by tmdb_id; the user's
 * rankings are a separate, later overlay that can only ever ADD seen/rating
 * state onto a film already present, never remove one.
 */
export function useCollectionFilms(collectionId: string | null, userId: string | null) {
  const [films, setFilms] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(!!collectionId);

  useEffect(() => {
    if (!collectionId) {
      setFilms([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);

      const { data: itemRows, error: itemsError } = await supabase
        .from("film_collection_items")
        .select("tmdb_id")
        .eq("collection_id", collectionId);

      if (cancelled) return;
      if (itemsError || !itemRows || itemRows.length === 0) {
        setFilms([]);
        setLoading(false);
        return;
      }

      const tmdbIds = itemRows.map((r) => r.tmdb_id);

      const { data: movieRows, error: moviesError } = await supabase
        .from("movies")
        .select("id, title, release_year, poster_url, thumb_url, tmdb_id, created_at")
        .in("tmdb_id", tmdbIds)
        .order("release_year", { ascending: true, nullsFirst: false });

      if (cancelled) return;
      if (moviesError || !movieRows) {
        setFilms([]);
        setLoading(false);
        return;
      }

      let rankingByMovieId = new Map<string, { id?: string; seen_it: boolean; ranking: number | null; user_id: string }>();
      if (userId) {
        const { data: rankingRows } = await supabase
          .from("rankings")
          .select("id, movie_id, seen_it, ranking, user_id")
          .eq("user_id", userId)
          .in("movie_id", movieRows.map((m) => m.id));

        rankingByMovieId = new Map(
          (rankingRows ?? [])
            .filter((r): r is typeof r & { movie_id: string } => !!r.movie_id)
            .map((r) => [r.movie_id, { id: r.id, seen_it: !!r.seen_it, ranking: r.ranking, user_id: r.user_id ?? userId }])
        );
      }

      if (cancelled) return;

      setFilms(
        movieRows.map((m) => {
          const ranking = rankingByMovieId.get(m.id);
          return {
            ...m,
            rankings: ranking ? [ranking] : [],
          } as Movie;
        })
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [collectionId, userId]);

  // Lightweight partial-update path, matching MovieCard's onUpdate signature,
  // without pulling in useMovieDataWithGuest's full (up to 2999-row) catalog
  // fetch just to reach its updateMovieRanking function. Optimistic: patches
  // local state immediately, upserts in the background.
  const updateFilmRanking = useCallback(
    async (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => {
      if (!userId) return;

      setFilms((prev) =>
        prev.map((m) => {
          if (m.id !== movieId) return m;
          const existing = m.rankings[0];
          const merged = {
            id: existing?.id,
            user_id: userId,
            seen_it: updates.seen_it ?? existing?.seen_it ?? false,
            ranking: updates.ranking !== undefined ? updates.ranking : existing?.ranking ?? null,
          };
          return { ...m, rankings: [merged] };
        })
      );

      const current = films.find((m) => m.id === movieId);
      const existing = current?.rankings[0];
      await supabase.from("rankings").upsert(
        {
          user_id: userId,
          movie_id: movieId,
          seen_it: updates.seen_it ?? existing?.seen_it ?? false,
          ranking: updates.ranking !== undefined ? updates.ranking : existing?.ranking ?? null,
        },
        { onConflict: "user_id,movie_id" }
      );
    },
    [films, userId]
  );

  return { films, loading, updateFilmRanking };
}
