"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import type { Movie } from "@/types/types";
import type { UserAward } from "@/utils/normalizeUserAward";

const FIELDS = "id, title, release_year, poster_url, thumb_url, created_at";

/**
 * Films referenced by an award but absent from the client's movie list.
 *
 * Two separate gaps make this necessary, and both are easy to miss:
 *
 * 1. **The window.** `fetchMoviesForKey` loads 3000 of ~4400 rows with no
 *    `ORDER BY`, so any given film may simply not be there.
 * 2. **The rescue only covers ratings.** The authenticated path back-fills
 *    films the user has *rated*. A film that was only ever picked — the whole
 *    output of the guest year-walk, where a verdict is a preference rather
 *    than a rating (Fork B) — is referenced by an award and nothing else, so
 *    nothing rescues it.
 *
 * Without this, a visitor who walks eight years and signs up to "keep" them
 * lands on a home that can't render a single one.
 */
export function useAwardFilms(awards: UserAward[], movies: Movie[]): Map<string, Movie> {
  const [fetched, setFetched] = useState<Map<string, Movie>>(new Map());

  const present = useMemo(
    () => new Set(movies.map((m) => String(m.id))),
    [movies]
  );

  const missingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of awards) {
      if (a.winnerId != null) ids.add(String(a.winnerId));
      for (const n of a.nomineeIds ?? []) ids.add(String(n));
    }
    for (const id of present) ids.delete(id);
    return [...ids].sort();
  }, [awards, present]);

  const key = missingIds.join(",");

  useEffect(() => {
    if (missingIds.length === 0) {
      setFetched(new Map());
      return;
    }
    let cancelled = false;

    void (async () => {
      const next = new Map<string, Movie>();
      // Chunked for the same reason the rankings rescue is: a single `.in()`
      // with hundreds of UUIDs can blow the gateway URL limit and fail silently.
      const CHUNK = 50;
      for (let i = 0; i < missingIds.length; i += CHUNK) {
        const { data, error } = await supabase
          .from("movies")
          .select(FIELDS)
          .in("id", missingIds.slice(i, i + CHUNK));
        if (error) {
          console.warn("Award film fetch failed:", error.message);
          continue;
        }
        for (const m of data ?? []) {
          next.set(String(m.id), {
            ...m,
            thumb_url: m.thumb_url ?? "",
            rankings: [],
          } as Movie);
        }
      }
      if (!cancelled) setFetched(next);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the
    // stable serialisation of missingIds; the array identity changes per render.
  }, [key]);

  return fetched;
}
