"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Movie } from "@/types/types";

export type QualityTagCollection = {
  tag: string;
  count: number;
  movieIds: string[];
  posterUrls: string[];
};

// A collection needs 2+ films tagged the same thing before it's a pattern
// worth showing — lighter than the Awards Gallery's 3+ nominee gate, since
// this is a personal reflection surface, not a competitive category.
const MIN_COLLECTION_SIZE = 2;
const MAX_COLLECTIONS = 12;

/**
 * Groups a user's `expressions.quality_tags` into "collections" — films that
 * share a tag. RLS on `expressions` is owner-only, so this naturally returns
 * empty for anyone viewing someone else's profile; no explicit ownership
 * check is needed here.
 */
export function useQualityTagCollections(
  userId: string | null,
  movies: Movie[]
): { collections: QualityTagCollection[]; loading: boolean } {
  const supabase = useSupabaseClient();
  const [collections, setCollections] = useState<QualityTagCollection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setCollections([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchCollections() {
      setLoading(true);

      // Not filtering empty quality_tags server-side (array-literal filter
      // syntax is fragile via PostgREST) — the grouping loop below simply
      // adds nothing for rows with no tags, which is equivalent and simpler.
      const { data, error } = await supabase
        .from("expressions")
        .select("movie_id, quality_tags")
        .eq("user_id", userId);

      if (cancelled) return;

      if (error || !data) {
        setCollections([]);
        setLoading(false);
        return;
      }

      const movieById = new Map(movies.map((m) => [m.id, m]));
      // First-seen casing wins for display; group keyed by lowercase.
      const groups = new Map<string, { label: string; movieIds: string[] }>();

      for (const row of data as { movie_id: string; quality_tags: string[] | null }[]) {
        for (const tag of row.quality_tags ?? []) {
          const trimmed = tag.trim();
          if (!trimmed) continue;
          const key = trimmed.toLowerCase();
          if (!groups.has(key)) groups.set(key, { label: trimmed, movieIds: [] });
          groups.get(key)!.movieIds.push(row.movie_id);
        }
      }

      const built = Array.from(groups.values())
        .filter((g) => g.movieIds.length >= MIN_COLLECTION_SIZE)
        .map((g) => ({
          tag: g.label,
          count: g.movieIds.length,
          movieIds: g.movieIds,
          posterUrls: g.movieIds
            .map((id) => movieById.get(id)?.poster_url || null)
            .filter((url): url is string => Boolean(url))
            .slice(0, 5),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_COLLECTIONS);

      setCollections(built);
      setLoading(false);
    }

    void fetchCollections();
    return () => {
      cancelled = true;
    };
  }, [userId, movies, supabase]);

  return { collections, loading };
}
