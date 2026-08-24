"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import {
  CONTESTED_YEARS,
  WALK_CHOICES_PER_YEAR,
  WALK_MIN_VOTES,
} from "@/data/contestedYears";

export interface YearCandidate {
  id: string;
  title: string;
  posterUrl: string;
}

const FIELDS = "id, title, poster_url";

/**
 * The chooser row for one year of the guest walk.
 *
 * Fetched per year rather than filtered out of the client's movie list. That
 * list is `.range(0, 2999)` of ~4,400 rows with no `ORDER BY`, so which films
 * it holds for any given year is arbitrary and unstable — fine for browsing,
 * useless for "here are the contenders for 1994."
 *
 * Two sources, in order:
 *
 * 1. **The pinned rival** (`CONTESTED_YEARS[].rivalId`) — the film the year is
 *    actually famous for. Always first, because a rating-ordered query doesn't
 *    reliably surface it: it misses The Social Network for 2010 and Brokeback
 *    Mountain for 2005.
 * 2. **Rating-ordered fill** — `imdb_rating DESC` above a votes floor. Ordering
 *    by `vote_count` instead returns Salt and The A-Team for 2010; don't.
 *
 * The Academy's own winner is excluded — endorsing it is the separate "Agreed"
 * action, not a tile in the row.
 */
export function useYearCandidates(
  year: number | null,
  excludeMovieId: string | null
): YearCandidate[] {
  const [candidates, setCandidates] = useState<YearCandidate[]>([]);

  useEffect(() => {
    if (year == null) {
      setCandidates([]);
      return;
    }
    let cancelled = false;

    void (async () => {
      const rivalId = CONTESTED_YEARS.find((c) => c.year === year)?.rivalId ?? null;

      const [rivalRes, fillRes] = await Promise.all([
        rivalId
          ? supabase.from("movies").select(FIELDS).eq("id", rivalId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("movies")
          .select(FIELDS)
          .eq("release_year", year)
          .not("poster_url", "is", null)
          .gte("imdb_votes", WALK_MIN_VOTES)
          .order("imdb_rating", { ascending: false, nullsFirst: false })
          // Over-fetch: the rival and the Academy's winner are both likely to
          // be in here and get filtered out below.
          .limit(WALK_CHOICES_PER_YEAR + 3),
      ]);

      if (cancelled) return;

      const seen = new Set<string>();
      if (excludeMovieId) seen.add(String(excludeMovieId));

      const out: YearCandidate[] = [];
      const push = (m: { id: string; title: string; poster_url: string | null } | null) => {
        if (!m || !m.poster_url || seen.has(String(m.id))) return;
        seen.add(String(m.id));
        out.push({ id: String(m.id), title: m.title, posterUrl: m.poster_url });
      };

      push(rivalRes.data as never);
      for (const m of (fillRes.data ?? []) as never[]) {
        if (out.length >= WALK_CHOICES_PER_YEAR) break;
        push(m);
      }

      setCandidates(out);
    })();

    return () => {
      cancelled = true;
    };
  }, [year, excludeMovieId]);

  return candidates;
}
