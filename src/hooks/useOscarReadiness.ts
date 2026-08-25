"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import {
  getActiveAwardsSeasonYear,
  getCeremonyDateISO,
  getDaysUntilCeremony,
} from "@/lib/awardsSeason";
import type { Movie } from "@/types/types";

// Mirrors MOVIE_LIST_FIELDS in sharedMovieUtils — enough for MovieCard to
// render. `rankings` is filled in by the caller from its own user-scoped data.
const NOMINEE_MOVIE_FIELDS =
  "id, title, release_year, poster_url, thumb_url, created_at, overview, tmdb_id, imdb_rating, metacritic_score, imdb_votes, vote_count, popularity, runtime, director, cast_list, mpaa_rating, genres";

/**
 * Loads the nominee slate for the Oscar-night readiness screen.
 *
 * This hook deliberately does NOT resolve "have I seen it" — it returns the
 * ceremony structure only. The caller joins it against the movies/rankings it
 * already has (via useMovieDataWithGuest), which keeps guest mode working the
 * same way it does everywhere else instead of growing a second seen-state path.
 *
 * Which ceremony gets shown
 * -------------------------
 * The active awards season (getActiveAwardsSeasonYear) has no nominees until
 * they are announced each January — for the 99th that is 2027-01-21. Rather
 * than render an empty screen for the five months in between, this falls back
 * to the most recent ceremony that actually has a slate, and reports which
 * case it is via `isLiveCycle`. The countdown always points at the NEXT
 * ceremony regardless, so during the January gap the screen reads "here is how
 * you finished last year, and the new nominations land in N days."
 */

export interface ReadinessNomination {
  id: string;
  workTitle: string | null;
  workYear: number | null;
  isWinner: boolean;
  tmdbId: number | null;
}

export interface ReadinessCategory {
  id: string;
  slug: string;
  displayName: string;
  ordinal: number;
  nominations: ReadinessNomination[];
}

/** Catalog row for a nominated film — display data only, no user state. */
export type ReadinessMovie = Movie;

export interface ReadinessSlate {
  /** Film year of the slate being shown (2025 = the 98th). */
  filmYear: number;
  shortName: string;
  ceremonyDate: string | null;
  categories: ReadinessCategory[];
  /**
   * Catalog rows for the nominated films, keyed by tmdb_id.
   *
   * Fetched here rather than taken from useMovieDataWithGuest because that
   * hook pages `movies` with `.range(0, 2999)` and no ORDER BY. With 4,411
   * movies in the catalog, 123 of the 98th's 125 nominations fall outside
   * that window — a nominee slate is by definition the newest films, and
   * those sort last. Reading display data from there would render almost the
   * entire slate as "not in catalog". These ~50 rows are fetched by id
   * instead, which is both correct and far smaller.
   */
  moviesByTmdbId: Map<number, ReadinessMovie>;
  /** True when the slate shown is the season currently being tracked. */
  isLiveCycle: boolean;
  /** Film year of the season in progress, whether or not it has nominees. */
  activeFilmYear: number;
  /** Days until the next ceremony. Null before the date is known. */
  daysToNextCeremony: number | null;
  nextCeremonyDate: string | null;
}

interface CeremonyRow {
  id: string;
  year: number;
  short_name: string | null;
  official_name: string | null;
  event_date: string | null;
}

interface CategoryRow {
  id: string;
  ceremony_id: string;
  canonical_slug: string;
  display_name: string;
  ordinal: number | null;
  nominations: Array<{
    id: string;
    work_title: string | null;
    work_year: number | null;
    is_winner: boolean;
    tmdb_id: number | null;
  }> | null;
}

export function useOscarReadiness() {
  const [slate, setSlate] = useState<ReadinessSlate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const activeFilmYear = getActiveAwardsSeasonYear();

      const { data: ceremonyData, error: ceremonyError } = await supabase
        .from("ceremonies")
        .select("id, year, short_name, official_name, event_date")
        .eq("domain", "film")
        .order("year", { ascending: false });

      if (cancelled) return;
      if (ceremonyError) {
        setError(ceremonyError.message);
        setLoading(false);
        return;
      }

      const ceremonies = (ceremonyData ?? []) as CeremonyRow[];
      if (!ceremonies.length) {
        setSlate(null);
        setLoading(false);
        return;
      }

      // Only ever consider the active season and the one before it. That is
      // enough to cover the January gap, and it keeps the payload flat as the
      // historical archive grows rather than fetching every ceremony ever.
      const candidates = ceremonies
        .filter((c) => c.year <= activeFilmYear)
        .slice(0, 2);

      const { data: categoryData, error: categoryError } = await supabase
        .from("award_categories")
        .select(
          "id, ceremony_id, canonical_slug, display_name, ordinal, nominations(id, work_title, work_year, is_winner, tmdb_id)"
        )
        .in(
          "ceremony_id",
          candidates.map((c) => c.id)
        )
        .order("ordinal", { ascending: true });

      if (cancelled) return;
      if (categoryError) {
        setError(categoryError.message);
        setLoading(false);
        return;
      }

      const categories = (categoryData ?? []) as CategoryRow[];

      // Pick the newest candidate that actually has nominations behind it. A
      // ceremony row can exist with an empty slate — the 99th is seeded that
      // way so the countdown has a date before nominees are announced.
      const chosen =
        candidates.find((c) =>
          categories.some((cat) => cat.ceremony_id === c.id && (cat.nominations?.length ?? 0) > 0)
        ) ?? null;

      const nextCeremonyDate =
        ceremonies.find((c) => c.year === activeFilmYear)?.event_date ??
        getCeremonyDateISO(activeFilmYear);

      if (!chosen) {
        // No slate anywhere yet. The screen still has a countdown to render.
        setSlate({
          filmYear: activeFilmYear,
          shortName: ceremonies.find((c) => c.year === activeFilmYear)?.short_name ?? "",
          ceremonyDate: nextCeremonyDate,
          categories: [],
          moviesByTmdbId: new Map(),
          isLiveCycle: true,
          activeFilmYear,
          daysToNextCeremony: getDaysUntilCeremony(activeFilmYear),
          nextCeremonyDate,
        });
        setLoading(false);
        return;
      }

      const mapped: ReadinessCategory[] = categories
        .filter((cat) => cat.ceremony_id === chosen.id)
        .map((cat) => ({
          id: cat.id,
          slug: cat.canonical_slug,
          displayName: cat.display_name,
          ordinal: cat.ordinal ?? 0,
          nominations: (cat.nominations ?? []).map((n) => ({
            id: n.id,
            workTitle: n.work_title,
            workYear: n.work_year,
            isWinner: n.is_winner,
            tmdbId: n.tmdb_id,
          })),
        }))
        .sort((a, b) => a.ordinal - b.ordinal);

      // Targeted fetch of just the nominated films — see moviesByTmdbId.
      const tmdbIds = [
        ...new Set(
          mapped.flatMap((cat) =>
            cat.nominations.map((n) => n.tmdbId).filter((id): id is number => id != null)
          )
        ),
      ];

      const moviesByTmdbId = new Map<number, ReadinessMovie>();
      if (tmdbIds.length) {
        const { data: movieData, error: movieError } = await supabase
          .from("movies")
          .select(NOMINEE_MOVIE_FIELDS)
          .in("tmdb_id", tmdbIds);

        if (cancelled) return;
        if (movieError) {
          setError(movieError.message);
          setLoading(false);
          return;
        }
        for (const row of movieData ?? []) {
          // NOMINEE_MOVIE_FIELDS mirrors MOVIE_LIST_FIELDS, but the select is a
          // string so its result isn't structurally typed as Movie. `rankings`
          // is empty by construction — the caller supplies user state.
          const movie = { ...row, rankings: [] } as unknown as ReadinessMovie;
          if (movie.tmdb_id != null) moviesByTmdbId.set(movie.tmdb_id, movie);
        }
      }

      setSlate({
        filmYear: chosen.year,
        shortName: chosen.short_name ?? chosen.official_name ?? `${chosen.year} films`,
        ceremonyDate: chosen.event_date,
        categories: mapped,
        moviesByTmdbId,
        isLiveCycle: chosen.year === activeFilmYear,
        activeFilmYear,
        daysToNextCeremony: getDaysUntilCeremony(activeFilmYear),
        nextCeremonyDate,
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { slate, loading, error };
}
