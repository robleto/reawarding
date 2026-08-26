import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type MovieSearchFilter = (
  query: ReturnType<ReturnType<SupabaseClient<Database>["from"]>["select"]>
) => ReturnType<ReturnType<SupabaseClient<Database>["from"]>["select"]>;

/**
 * Title search ranked exact > prefix > substring match, each tier sorted by
 * TMDB `popularity` (nulls last). Plain `ilike '%term%'` with no ORDER BY
 * returns rows in arbitrary/insertion order, so a franchise original (e.g.
 * "Scream") can be crowded out of the limit by its own sequels even after
 * the user has typed the full title. Runs the three tiers in parallel and
 * merges, so the exact match is never lost before the limit is applied.
 */
export async function searchMoviesRanked<T extends { id: string }>(
  supabase: SupabaseClient<Database>,
  term: string,
  options: { select: string; limit?: number; filter?: MovieSearchFilter }
): Promise<T[]> {
  const { select, limit = 7, filter } = options;

  const buildQuery = (pattern: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = supabase.from("movies").select(select).ilike("title", pattern) as any;
    if (filter) query = filter(query);
    return query.order("popularity", { ascending: false, nullsFirst: false }).limit(limit);
  };

  const [exact, prefix, substring] = await Promise.all([
    buildQuery(term),
    buildQuery(`${term}%`),
    buildQuery(`%${term}%`),
  ]);

  for (const tier of [exact, prefix, substring]) {
    if (tier.error) console.error("searchMoviesRanked tier failed:", tier.error.message);
  }

  const seen = new Set<string>();
  const results: T[] = [];
  for (const tier of [exact.data, prefix.data, substring.data]) {
    for (const row of (tier || []) as T[]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      results.push(row);
      if (results.length >= limit) break;
    }
    if (results.length >= limit) break;
  }
  return results;
}
