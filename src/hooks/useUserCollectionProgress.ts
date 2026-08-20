"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

export interface UserCollectionProgress {
  collectionId: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  badgeIcon: string | null;
  badgeColor: string | null;
  filmsSeen: number;
  totalFilms: number;
  completionPercentage: number;
  isCompleted: boolean;
  posterUrls: string[];
}

/**
 * user_collection_progress_view is hard-scoped to auth.uid() in its own
 * definition (it computes user_id from auth.uid() internally, not from a
 * passed-in filter) — every row it returns is always the CURRENT SESSION's
 * progress, never an arbitrary profile's. Only call this with
 * `enabled = true` when the viewer is looking at their own profile; showing
 * it while viewing someone else's would silently show the viewer's own
 * progress mislabeled as the profile owner's.
 */
export function useUserCollectionProgress(enabled: boolean) {
  const [collections, setCollections] = useState<UserCollectionProgress[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setCollections([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);

      const { data: progressRows, error: progressError } = await supabase
        .from("user_collection_progress_view")
        .select("*")
        .order("completion_percentage", { ascending: false });

      if (cancelled) return;
      if (progressError || !progressRows) {
        setCollections([]);
        setLoading(false);
        return;
      }

      const collectionIds = progressRows
        .map((r) => r.collection_id)
        .filter((id): id is string => !!id);

      const metaById = new Map<string, { description: string | null; category: string | null }>();
      const posterUrlsByCollection: Record<string, string[]> = {};

      if (collectionIds.length > 0) {
        const [{ data: metaRows }, { data: itemRows }] = await Promise.all([
          supabase.from("film_collections").select("id, description, category").in("id", collectionIds),
          supabase.from("film_collection_items").select("collection_id, tmdb_id").in("collection_id", collectionIds),
        ]);

        for (const m of metaRows ?? []) {
          metaById.set(m.id, { description: m.description, category: m.category });
        }

        const tmdbIds = Array.from(new Set((itemRows ?? []).map((r) => r.tmdb_id)));
        const { data: posterRows } = tmdbIds.length
          ? await supabase.from("movies").select("tmdb_id, poster_url").in("tmdb_id", tmdbIds)
          : { data: [] as { tmdb_id: number; poster_url: string | null }[] };

        const posterByTmdbId = new Map((posterRows ?? []).map((m) => [m.tmdb_id, m.poster_url]));

        // Fan needs at most 5 — stop collecting once every collection present
        // has enough, rather than gathering every poster up front.
        for (const item of itemRows ?? []) {
          const url = posterByTmdbId.get(item.tmdb_id);
          if (!url) continue;
          const list = posterUrlsByCollection[item.collection_id] ?? (posterUrlsByCollection[item.collection_id] = []);
          if (list.length < 5) list.push(url);
        }
      }

      if (cancelled) return;

      setCollections(
        progressRows
          .filter((r): r is typeof r & { collection_id: string; slug: string; title: string } =>
            !!r.collection_id && !!r.slug && !!r.title
          )
          .map((r) => ({
            collectionId: r.collection_id,
            slug: r.slug,
            title: r.title,
            description: metaById.get(r.collection_id)?.description ?? null,
            category: metaById.get(r.collection_id)?.category ?? null,
            badgeIcon: r.badge_icon,
            badgeColor: r.badge_color,
            filmsSeen: Number(r.films_seen ?? 0),
            totalFilms: Number(r.total_films ?? 0),
            completionPercentage: Number(r.completion_percentage ?? 0),
            isCompleted: !!r.is_completed,
            posterUrls: posterUrlsByCollection[r.collection_id] ?? [],
          }))
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { collections, loading };
}
