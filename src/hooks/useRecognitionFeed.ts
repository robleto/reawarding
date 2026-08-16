"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { fetchOfficialAwardWinners } from "@/data/officialAwardWinners";
import type { Movie } from "@/types/types";

export interface FeedRow {
  id: string;
  label: string;
  films: Movie[];
}

const FEED_COLS =
  "id, title, release_year, poster_url, thumb_url, imdb_rating, genres";

type Ranking = Movie["rankings"][number];

// rankingsById comes from the already-fetched, per-user-enriched `movies`
// list (see useMovieDataWithGuest/sharedMovieUtils) — reusing it here avoids
// a second rankings query and keeps seen/rating badges in these rows in
// sync with the same source of truth as the rest of the Films page.
function toMovies(
  data: Record<string, unknown>[] | null,
  rankingsById: Map<string, Ranking>
): Movie[] {
  if (!data) return [];
  return data.map((m) => {
    const ranking = rankingsById.get(m.id as string);
    return { ...m, rankings: ranking ? [ranking] : [] } as unknown as Movie;
  });
}

// Curated pool: Best Picture winners from the last 25 years, newest first.
// These are films everyone recognises — ideal recognition triggers. Sourced
// from the verified official_award_winners table (see src/data/officialAwardWinners.ts),
// not the old static file, which mislabeled the 1st ceremony's winner.
async function getCuratedWinnerTitles(): Promise<string[]> {
  const winners = await fetchOfficialAwardWinners();
  return Array.from(winners.values())
    .sort((a, b) => b.year - a.year)
    .slice(0, 25)
    .map((w) => w.filmTitle);
}

/**
 * useRecognitionFeed — 2–3 rows of films the user hasn't rated yet,
 * designed as recognition triggers ("oh I've seen that, let me rate it").
 *
 * Row 1  "Award winners"   — curated Best Picture winners fetched by title.
 *                            Guaranteed to return results if those films are in the DB.
 * Row 2  "Acclaimed films" — imdb_rating desc, floored at 250k+ IMDb votes so
 *                            fan-vote-inflated obscurities can't outrank classics.
 * Row 3  "Notable films"   — widely-seen movies: imdb_votes desc. Popularity,
 *                            not acclaim — the row most likely to trigger "I've seen that".
 *
 * movies (the full per-user movie list) is read via ref so a new rating
 * doesn't re-fire the fetch.
 */
export function useRecognitionFeed(
  movies: Movie[]
): { rows: FeedRow[]; loading: boolean } {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const moviesRef = useRef(movies);
  moviesRef.current = movies;

  useEffect(() => {
    let cancelled = false;

    async function fetchFeed() {
      setLoading(true);

      const curatedWinnerTitles = await getCuratedWinnerTitles();
      if (cancelled) return;

      const [winnersResult, acclaimedResult, notableResult] = await Promise.all([
        // Row 1: Curated Best Picture winners — fetch by known titles
        supabase
          .from("movies")
          .select(FEED_COLS)
          .in("title", curatedWinnerTitles)
          .limit(30),

        // Row 2: Acclaimed films — rating desc, with a high vote floor so
        // fan-vote-inflated obscurities can't outrank The Godfather
        supabase
          .from("movies")
          .select(FEED_COLS)
          .not("imdb_rating", "is", null)
          .gte("imdb_votes", 250000)
          .order("imdb_rating", { ascending: false })
          .limit(50),

        // Row 3: Notable films — widely seen, sorted by IMDb vote count desc
        supabase
          .from("movies")
          .select(FEED_COLS)
          .gt("imdb_votes", 0)
          .order("imdb_votes", { ascending: false })
          .limit(50),
      ]);

      if (cancelled) return;

      const rankingsById = new Map<string, Ranking>();
      const ids = new Set<string>();
      for (const m of moviesRef.current) {
        if (m.rankings.length > 0) {
          ids.add(m.id);
          rankingsById.set(m.id, m.rankings[0]);
        }
      }

      const filter = (d: Record<string, unknown>[] | null, limit = 20) =>
        toMovies(d, rankingsById)
          .filter((m) => !ids.has(m.id))
          .slice(0, limit);

      // Row 1: preserve curated order (newest winner first)
      const winnerFilms = (() => {
        const raw = toMovies(
          (winnersResult.data as Record<string, unknown>[] | null) ?? null,
          rankingsById
        ).filter((m) => !ids.has(m.id));
        // re-sort to match CURATED_WINNER_TITLES order (newest first)
        return raw
          .sort(
            (a, b) =>
              curatedWinnerTitles.indexOf(a.title) -
              curatedWinnerTitles.indexOf(b.title)
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
        (notableResult.data as Record<string, unknown>[] | null) ?? null,
        rankingsById
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
