"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { BEST_PICTURE_WINNERS } from "@/data/bestPictureWinners";
import type { Movie } from "@/types/types";

export interface FeedRow {
  id: string;
  label: string;
  films: Movie[];
}

const FEED_COLS =
  "id, title, release_year, poster_url, thumb_url, cached_poster_url, cached_thumb_url, imdb_rating, genres";

function toMovies(data: Record<string, unknown>[] | null): Movie[] {
  if (!data) return [];
  return data.map((m) => ({ ...m, rankings: [] } as unknown as Movie));
}

// Curated pool: Best Picture winners from the last 25 years, newest first.
// These are films everyone recognises — ideal recognition triggers.
const CURATED_WINNER_TITLES = Object.values(BEST_PICTURE_WINNERS)
  .sort((a, b) => b.year - a.year)
  .slice(0, 25)
  .map((w) => w.title);

/**
 * useRecognitionFeed — 2–3 rows of films the user hasn't rated yet,
 * designed as recognition triggers ("oh I've seen that, let me rate it").
 *
 * Row 1  "Award winners"  — curated Best Picture winners fetched by title.
 *                           Guaranteed to return results if those films are in the DB.
 * Row 2  "Acclaimed films" — DB query: imdb_rating IS NOT NULL, sorted desc.
 *                           No numeric floor so it works even with sparse enrichment.
 * Row 3  "More [genre]"   — genre array match, sorted by imdb_rating desc nulls last.
 *                           Only rendered if user has taste data.
 *
 * userMovieIds is read via ref so a new rating doesn't re-fire the fetch.
 */
export function useRecognitionFeed(
  userMovieIds: Set<number>,
  topGenre: string | null,
  topGenreExemplar: string | null
): { rows: FeedRow[]; loading: boolean } {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const idsRef = useRef(userMovieIds);
  idsRef.current = userMovieIds;

  useEffect(() => {
    let cancelled = false;

    async function fetchFeed() {
      setLoading(true);

      const [winnersResult, acclaimedResult, genreResult] = await Promise.all([
        // Row 1: Curated Best Picture winners — fetch by known titles
        supabase
          .from("movies")
          .select(FEED_COLS)
          .in("title", CURATED_WINNER_TITLES)
          .limit(30),

        // Row 2: Acclaimed films — no numeric floor, just sort by rating desc
        supabase
          .from("movies")
          .select(FEED_COLS)
          .not("imdb_rating", "is", null)
          .order("imdb_rating", { ascending: false })
          .limit(50),

        // Row 3: Genre match (only queried when topGenre is known)
        topGenre
          ? supabase
              .from("movies")
              .select(FEED_COLS)
              .contains("genres", [topGenre])
              .order("imdb_rating", { ascending: false, nullsFirst: false })
              .limit(40)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (cancelled) return;

      const ids = idsRef.current;
      const filter = (d: Record<string, unknown>[] | null, limit = 20) =>
        toMovies(d)
          .filter((m) => !ids.has(m.id))
          .slice(0, limit);

      // Row 1: preserve curated order (newest winner first)
      const winnerFilms = (() => {
        const raw = toMovies(
          (winnersResult.data as Record<string, unknown>[] | null) ?? null
        ).filter((m) => !ids.has(m.id));
        // re-sort to match CURATED_WINNER_TITLES order (newest first)
        return raw
          .sort(
            (a, b) =>
              CURATED_WINNER_TITLES.indexOf(a.title) -
              CURATED_WINNER_TITLES.indexOf(b.title)
          )
          .slice(0, 20);
      })();

      const acclaimedFilms = filter(
        (acclaimedResult.data as Record<string, unknown>[] | null) ?? null,
        20
      );

      // Remove overlap between acclaimed and winners to keep rows distinct
      const winnerIds = new Set(winnerFilms.map((m) => m.id));
      const acclaimedDistinct = acclaimedFilms.filter(
        (m) => !winnerIds.has(m.id)
      );

      const genreFilms = topGenre
        ? filter(
            (genreResult.data as Record<string, unknown>[] | null) ?? null,
            20
          ).filter((m) => !winnerIds.has(m.id))
        : [];

      const newRows: FeedRow[] = [];

      if (winnerFilms.length >= 3) {
        newRows.push({
          id: "winners",
          label: "Best Picture winners",
          films: winnerFilms,
        });
      }

      if (acclaimedDistinct.length >= 3) {
        newRows.push({
          id: "acclaimed",
          label: "Acclaimed & unrated",
          films: acclaimedDistinct,
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
