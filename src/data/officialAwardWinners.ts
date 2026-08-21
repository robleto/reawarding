/**
 * Official Academy Award winners — sourced from public.official_award_winners
 * (see PRODUCT_DECISION_LOG.md, July 2026, "Premium Tier Direction").
 *
 * Replaces the old static BEST_PICTURE_WINNERS lookup (src/data/bestPictureWinners.ts),
 * which had two live bugs: the 1st ceremony's winner was misattributed (listed
 * "Sunrise: A Song of Two Humans" — a different, one-time-only category — at
 * year 1927, then placed the real winner, Wings, at 1928, its wrong release
 * year), and every comparison matched by lowercased title string rather than
 * movie ID, which silently fails for titles like "Birdman or (The Unexpected
 * Virtue of Ignorance)" that don't match a shortened display title exactly.
 *
 * This module fetches the real table once (it's small, ~100 rows, and public/
 * read-only reference data — no per-user join needed) and caches the promise
 * so every caller shares one network request regardless of how many components
 * use the hook.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import type { OfficialAwardWinner } from "@/utils/academyStatus";

// Re-exported for backward compatibility — getAcademyStatus/getAcademyContextMessage
// used to live in this file. They moved to src/utils/academyStatus.ts (a pure
// module with no Supabase import of any kind) specifically so server code
// (src/app/api/alternate-oscar-history/route.ts) can use them without
// pulling this file's browser-only `supabase` client into a server bundle.
export type { OfficialAwardWinner, AcademyStatus, AcademyStatusResult } from "@/utils/academyStatus";
export { getAcademyStatus, getAcademyContextMessage } from "@/utils/academyStatus";

let cached: Promise<Map<number, OfficialAwardWinner>> | null = null;

async function loadOfficialAwardWinners(): Promise<Map<number, OfficialAwardWinner>> {
  const { data, error } = await supabase
    .from("official_award_winners")
    .select("year, category, film_title, movie_id, match_status")
    .eq("category", "best-picture");

  if (error) {
    console.warn("[officialAwardWinners] fetch failed:", error.message);
    cached = null; // allow retry on next call rather than caching a failure
    return new Map<number, OfficialAwardWinner>();
  }

  const map = new Map<number, OfficialAwardWinner>();
  for (const row of data ?? []) {
    map.set(row.year, {
      year: row.year,
      category: row.category,
      filmTitle: row.film_title,
      movieId: row.movie_id,
      matchStatus: row.match_status as OfficialAwardWinner["matchStatus"],
    });
  }
  return map;
}

export function fetchOfficialAwardWinners(): Promise<Map<number, OfficialAwardWinner>> {
  if (!cached) {
    cached = loadOfficialAwardWinners();
  }
  return cached;
}

export function useOfficialAwardWinners(): {
  winners: Map<number, OfficialAwardWinner>;
  loading: boolean;
} {
  const [winners, setWinners] = useState<Map<number, OfficialAwardWinner>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchOfficialAwardWinners().then((map) => {
      if (!cancelled) {
        setWinners(map);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { winners, loading };
}

