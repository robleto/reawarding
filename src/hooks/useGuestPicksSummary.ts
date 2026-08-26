"use client";

import { useEffect, useState } from "react";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";
import { fetchOfficialAwardWinners } from "@/data/officialAwardWinners";
import { supabase } from "@/lib/supabaseBrowser";

export interface GuestPick {
  year: number;
  title: string;
  posterUrl: string;
  /** Their pick matched the Academy's — a verdict, not a non-answer. */
  agreed: boolean;
}

export interface GuestPicksSummary {
  picks: GuestPick[];
  reawardedCount: number;
  agreedCount: number;
}

const EMPTY: GuestPicksSummary = { picks: [], reawardedCount: 0, agreedCount: 0 };

/**
 * Everything the guest has decided so far, resolved for display (Act 3 of
 * docs/design/first-rating-payoff.md).
 *
 * Reads guest *awards*, not ratings: a walk verdict is stored as a preference
 * via createAward's `seed_pick` source (Fork B), so ratings are the wrong
 * source and would miss most of the walk.
 *
 * Films are fetched by id rather than read from the client movie list — that
 * list is a 3000-of-4400 window with no ORDER BY, so picks routinely fall
 * outside it. This is the same gap that made guest ratings silently vanish
 * before the rescue fetch in fetchMoviesForKey.
 */
export function useGuestPicksSummary(): GuestPicksSummary {
  const awards = useGuestRankingStore((s) => s.awards);
  const [summary, setSummary] = useState<GuestPicksSummary>(EMPTY);

  // Stable dependency: the store object identity changes on unrelated writes.
  const key = Object.entries(awards)
    .map(([y, a]) => `${y}:${a.winnerId}`)
    .sort()
    .join(",");

  useEffect(() => {
    const entries = Object.values(awards);
    if (entries.length === 0) {
      setSummary(EMPTY);
      return;
    }
    let cancelled = false;

    void (async () => {
      const ids = [...new Set(entries.map((a) => a.winnerId))];
      const [filmsRes, officialMap] = await Promise.all([
        supabase.from("movies").select("id, title, poster_url").in("id", ids),
        fetchOfficialAwardWinners(),
      ]);
      if (cancelled) return;

      const films = new Map(
        (filmsRes.data ?? []).map((m) => [String(m.id), m])
      );

      const picks: GuestPick[] = entries
        .map((a) => {
          const film = films.get(String(a.winnerId));
          if (!film?.poster_url) return null;
          const official = officialMap.get(a.year);
          return {
            year: a.year,
            title: film.title,
            posterUrl: film.poster_url,
            agreed:
              official?.movieId != null &&
              String(official.movieId) === String(a.winnerId),
          };
        })
        .filter((p): p is GuestPick => p !== null)
        .sort((a, b) => b.year - a.year);

      setSummary({
        picks,
        reawardedCount: picks.filter((p) => !p.agreed).length,
        agreedCount: picks.filter((p) => p.agreed).length,
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the
    // stable serialisation of `awards`; depending on the object re-runs the
    // fetch on every unrelated store write.
  }, [key]);

  return summary;
}
