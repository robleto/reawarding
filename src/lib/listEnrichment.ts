import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export interface ListEnrichment {
  movie_count: number;
  posterUrls: string[];
}

/**
 * Batch-enrich a set of movie_lists rows with item counts and top-5 poster
 * previews (highest `ranking` first — same convention as ListDetailView's
 * default sort) in 2 Supabase round trips total, regardless of how many
 * lists are passed in.
 *
 * Replaces a pattern that was duplicated across multiple pages: for each
 * list, issue a movie_list_items count query, a movie_list_items top-5
 * query, and a movies poster lookup — 3 queries × N lists. PERF-2 —
 * docs/audits/2026-08-21-launch-readiness.md.
 */
export async function enrichListsWithCountsAndPosters<T extends { id: string }>(
  supabase: SupabaseClient<Database>,
  lists: T[]
): Promise<(T & ListEnrichment)[]> {
  if (lists.length === 0) return [];

  const listIds = lists.map((l) => l.id);

  const { data: itemRows } = await supabase
    .from("movie_list_items")
    .select("list_id, movie_id, ranking")
    .in("list_id", listIds);

  const itemsByList = new Map<string, { movie_id: string; ranking: number | null }[]>();
  for (const row of itemRows ?? []) {
    if (!row.list_id || !row.movie_id) continue;
    const arr = itemsByList.get(row.list_id) ?? [];
    arr.push({ movie_id: row.movie_id, ranking: row.ranking });
    itemsByList.set(row.list_id, arr);
  }

  const top5ByList = new Map<string, string[]>();
  const top5MovieIds = new Set<string>();
  for (const [listId, items] of itemsByList) {
    const top5 = [...items]
      .sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0))
      .slice(0, 5)
      .map((i) => i.movie_id);
    top5ByList.set(listId, top5);
    for (const id of top5) top5MovieIds.add(id);
  }

  const posterByMovieId = new Map<string, string>();
  if (top5MovieIds.size > 0) {
    const { data: movieRows } = await supabase
      .from("movies")
      .select("id, poster_url")
      .in("id", [...top5MovieIds]);
    for (const m of movieRows ?? []) {
      posterByMovieId.set(m.id, m.poster_url || "");
    }
  }

  return lists.map((list) => {
    const top5 = top5ByList.get(list.id) ?? [];
    return {
      ...list,
      movie_count: itemsByList.get(list.id)?.length ?? 0,
      posterUrls: top5.map((id) => posterByMovieId.get(id) || ""),
    };
  });
}
