"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export type UserList = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  list_type: string;
  updated_at: string;
  movie_count?: number;
  posterUrls?: string[];
};

/**
 * Fetches the current user's non-watchlist lists with movie counts + poster URLs.
 * Returns an empty array (not an error) when unauthenticated.
 */
export function useUserLists(userId: string | null): {
  lists: UserList[];
  loading: boolean;
  error: string | null;
} {
  const supabase = useSupabaseClient();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLists([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchLists() {
      setLoading(true);
      setError(null);

      // Fetch all non-watchlist lists for this user
      const { data: listsData, error: listsError } = await supabase
        .from("movie_lists")
        .select("*")
        .eq("user_id", userId)
        .neq("list_type", "watchlist")
        .order("updated_at", { ascending: false });

      if (listsError || !listsData) {
        if (!cancelled) {
          setError("Couldn't load your lists.");
          setLoading(false);
        }
        return;
      }

      // Enrich each list with count + top poster URLs
      const enriched = await Promise.all(
        listsData.map(async (list) => {
          const { count } = await supabase
            .from("movie_list_items")
            .select("*", { count: "exact", head: true })
            .eq("list_id", list.id);

          const { data: items } = await supabase
            .from("movie_list_items")
            .select("movie_id")
            .eq("list_id", list.id)
            .order("ranking", { ascending: true })
            .limit(5);

          const movieIds = (items ?? []).map((item: { movie_id: number }) => item.movie_id);
          let posterUrls: string[] = [];

          if (movieIds.length > 0) {
            const { data: movies } = await supabase
              .from("movies")
              .select("id, cached_poster_url, poster_url")
              .in("id", movieIds);

            if (movies) {
              type PosterRow = { id: number; cached_poster_url?: string | null; poster_url?: string | null };
              const posterMap = new Map(
                (movies as PosterRow[])
                  .map((m) => [m.id, m.cached_poster_url || m.poster_url || null] as [number, string | null])
                  .filter(([, url]) => Boolean(url))
              );
              posterUrls = movieIds
                .map((id: number) => posterMap.get(id))
                .filter((p): p is string => Boolean(p));
            }
          }

          return {
            ...list,
            movie_count: count ?? 0,
            posterUrls,
          } as UserList;
        })
      );

      if (!cancelled) {
        setLists(enriched);
        setLoading(false);
      }
    }

    void fetchLists();
    return () => { cancelled = true; };
  }, [userId, supabase]);

  return { lists, loading, error };
}
