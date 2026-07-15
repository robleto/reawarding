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
  "id, title, release_year, poster_url, thumb_url, imdb_rating, genres";

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
 * Row 1  "Award winners"   — curated Best Picture winners fetched by title.
 *                            Guaranteed to return results if those films are in the DB.
 * Row 2  "Acclaimed films" — imdb_rating desc, floored at 1000+ TMDB votes so
 *                            obscure films with inflated ratings can't outrank classics.
 * Row 3  "Notable films"   — widely-seen movies: TMDB vote_count desc. Popularity,
 *                            not acclaim — the row most likely to trigger "I've seen that".
 *
 * userMovieIds is read via ref so a new rating doesn't re-fire the fetch.
 */
export function useRecognitionFeed(
  userMovieIds: Set<string>
): { rows: FeedRow[]; loading: boolean } {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const idsRef = useRef(userMovieIds);
  idsRef.current = userMovieIds;

  useEffect(() => {
    let cancelled = false;

    async function fetchFeed() {
      setLoading(true);

      const [winnersResult, acclaimedResult, notableResult] = await Promise.all([
        // Row 1: Curated Best Picture winners — fetch by known titles
        supabase
          .from("movies")
          .select(FEED_COLS)
          .in("title", CURATED_WINNER_TITLES)
          .limit(30),

        // Row 2: Acclaimed films — rating desc, with a vote floor so a 9.3
        // from a handful of voters can't outrank The Godfather
        supabase
          .from("movies")
          .select(FEED_COLS)
          .not("imdb_rating", "is", null)
          .gte("vote_count", 1000)
          .order("imdb_rating", { ascending: false })
          .limit(50),

        // Row 3: Notable films — widely seen, sorted by TMDB vote count desc
        supabase
          .from("movies")
          .select(FEED_COLS)
          .gt("vote_count", 0)
          .order("vote_count", { ascending: false })
          .limit(50),
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

      // Notable row: dedup against both earlier rows so each row feels fresh
      const earlierIds = new Set([
        ...winnerIds,
        ...acclaimedDistinct.map((m) => m.id),
      ]);
      const notableFilms = toMovies(
        (notableResult.data as Record<string, unknown>[] | null) ?? null
      )
        .filter((m) => !ids.has(m.id) && !earlierIds.has(m.id))
        .slice(0, 20);

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

      if (notableFilms.length >= 3) {
        newRows.push({
          id: "notable",
          label: "Notable films",
          films: notableFilms,
        });
      }

      setRows(newRows);
      setLoading(false);
    }

    void fetchFeed();
    return () => {
      cancelled = true;
    };
  }, []); // userMovieIds read via ref — intentional

  return { rows, loading };
}
