"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import type { Movie } from "@/types/types";

export interface FeedRow {
  id: string;
  label: string;
  films: Movie[];
}

// Minimal column set — enough to render a poster card + open the year explorer
const FEED_COLS =
  "id, title, release_year, poster_url, thumb_url, cached_poster_url, cached_thumb_url, tmdb_rating, popularity, vote_count, genres";

function toMovies(data: Record<string, unknown>[] | null): Movie[] {
  if (!data) return [];
  return data.map((m) => ({ ...m, rankings: [] } as unknown as Movie));
}

/**
 * useRecognitionFeed — fetches 2-3 horizontally-scrollable rows of films the
 * user hasn't rated yet, surfaced as "rating triggers":
 *
 *   Row 1: Popular this year       (high TMDB popularity, current / last year)
 *   Row 2: Acclaimed & unrated     (high vote_count + tmdb_rating)
 *   Row 3: More [genre] (optional) (if user has a dominant taste genre)
 *
 * userMovieIds is read via ref so changes don't re-trigger the fetch.
 */
export function useRecognitionFeed(
  userMovieIds: Set<number>,
  topGenre: string | null,
  topGenreExemplar: string | null
): { rows: FeedRow[]; loading: boolean } {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep a stable ref so we don't re-fetch whenever the user rates something
  const idsRef = useRef(userMovieIds);
  idsRef.current = userMovieIds;

  useEffect(() => {
    let cancelled = false;
    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;

    async function fetchFeed() {
      setLoading(true);

      const [recentResult, acclaimedResult, genreResult] = await Promise.all([
        // Row 1: Popular in recent years
        supabase
          .from("movies")
          .select(FEED_COLS)
          .in("release_year", [currentYear, prevYear])
          .order("popularity", { ascending: false })
          .limit(40),

        // Row 2: Acclaimed all-time (high vote count + rating)
        supabase
          .from("movies")
          .select(FEED_COLS)
          .gte("vote_count", 50000)
          .gte("tmdb_rating", 7.5)
          .order("vote_count", { ascending: false })
          .limit(40),

        // Row 3: By top genre (only if a genre is known)
        topGenre
          ? supabase
              .from("movies")
              .select(FEED_COLS)
              .contains("genres", [topGenre])
              .gte("vote_count", 10000)
              .order("vote_count", { ascending: false })
              .limit(40)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (cancelled) return;

      const ids = idsRef.current;
      const filter = (d: Record<string, unknown>[] | null) =>
        toMovies(d)
          .filter((m) => !ids.has(m.id))
          .slice(0, 20);

      const recentFilms = filter(
        (recentResult.data as Record<string, unknown>[] | null) ?? null
      );
      const acclaimedFilms = filter(
        (acclaimedResult.data as Record<string, unknown>[] | null) ?? null
      );
      const genreFilms = topGenre
        ? filter(
            (genreResult.data as Record<string, unknown>[] | null) ?? null
          )
        : [];

      const newRows: FeedRow[] = [];

      if (recentFilms.length >= 3) {
        newRows.push({
          id: "recent",
          label: `Popular in ${currentYear}`,
          films: recentFilms,
        });
      }

      if (acclaimedFilms.length >= 3) {
        newRows.push({
          id: "acclaimed",
          label: "Acclaimed & unrated",
          films: acclaimedFilms,
        });
      }

      if (genreFilms.length >= 3 && topGenre) {
        const label = topGenreExemplar
          ? `Because you rated ${topGenreExemplar}`
          : `More ${topGenre.toLowerCase()}`;
        newRows.push({ id: "genre", label, films: genreFilms });
      }

      setRows(newRows);
      setLoading(false);
    }

    void fetchFeed();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topGenre, topGenreExemplar]); // userMovieIds read via ref — intentional

  return { rows, loading };
}
