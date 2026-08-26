"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Loader from "@/components/ui/Loading";
import ReadinessCategoryList, {
  type ReadinessRow,
} from "@/components/award/ReadinessCategoryList";
import { useOscarReadiness } from "@/hooks/useOscarReadiness";
import { useMovieDataWithGuest } from "@/utils/sharedMovieUtils";
import { NOMINATIONS_DATES } from "@/lib/awardsSeason";

/**
 * Oscar-night readiness — "how much of the slate have I actually seen?"
 *
 * A static segment alongside films/collections/[slug]. It lives under
 * Collections rather than in the nav because a per-ceremony slate is just
 * another collection, but it can't be a `film_collections` row: those are
 * fixed lists of TMDB ids, and this is derived from the nominations tables.
 */

function formatLongDate(iso: string | null): string | null {
  if (!iso) return null;
  // Parse as UTC noon so a date-only string can't slip a day in a negative
  // timezone offset.
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function OscarReadinessPage() {
  const { slate, loading: slateLoading, error } = useOscarReadiness();
  const { movies, loading: moviesLoading, updateMovieRanking } = useMovieDataWithGuest();

  /**
   * Movies the shared hook actually returned, keyed by tmdb_id. This is the
   * source of *user state* (rankings), not of display data: the hook caps its
   * fetch at 3,000 rows, so most of a nominee slate is missing from it. What
   * it does guarantee is that every film the user has ranked is present — it
   * rescue-fetches those separately — so a nominee absent from this map is
   * one the user has no ranking for, i.e. not seen.
   */
  const rankedByTmdbId = useMemo(() => {
    const map = new Map<number, (typeof movies)[number]>();
    for (const movie of movies) {
      if (movie.tmdb_id != null) map.set(movie.tmdb_id, movie);
    }
    return map;
  }, [movies]);

  // Optimistic seen-state for films that aren't in the shared hook's list.
  // updateMovieRanking persists them correctly either way, but its local patch
  // maps over its own `movies` array and so can't reflect a film it never had.
  const [seenOverride, setSeenOverride] = useState<Record<string, boolean>>({});

  const handleUpdate = useCallback(
    (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => {
      if (updates.seen_it !== undefined) {
        setSeenOverride((prev) => ({ ...prev, [movieId]: updates.seen_it as boolean }));
      }
      return updateMovieRanking(movieId, updates);
    },
    [updateMovieRanking]
  );

  const rows: ReadinessRow[] = useMemo(() => {
    if (!slate) return [];
    return slate.categories.map((category) => {
      const films = category.nominations.map((nomination) => {
        const tmdbId = nomination.tmdbId;
        // Display data comes from the slate's targeted fetch; the shared hook's
        // copy wins when present because it carries the user's rankings.
        const catalogMovie = tmdbId != null ? slate.moviesByTmdbId.get(tmdbId) ?? null : null;
        const rankedMovie = tmdbId != null ? rankedByTmdbId.get(tmdbId) ?? null : null;
        const movie = rankedMovie ?? catalogMovie;
        const seen = movie
          ? seenOverride[movie.id] ?? Boolean(movie.rankings[0]?.seen_it)
          : false;
        return {
          nominationId: nomination.id,
          movie,
          workTitle: nomination.workTitle ?? "Untitled",
          isWinner: nomination.isWinner,
          seen,
        };
      });
      return {
        slug: category.slug,
        displayName: category.displayName,
        ordinal: category.ordinal,
        films,
        total: films.length,
        seen: films.filter((f) => f.seen).length,
      };
    });
  }, [slate, rankedByTmdbId, seenOverride]);

  const totals = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + r.total, 0);
    const seen = rows.reduce((sum, r) => sum + r.seen, 0);
    const incomplete = rows.filter((r) => r.seen < r.total).length;
    return { total, seen, incomplete };
  }, [rows]);

  if (slateLoading || moviesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  const nominationsDate = slate ? formatLongDate(NOMINATIONS_DATES[slate.activeFilmYear] ?? null) : null;

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/films/collections"
          className="mb-6 inline-flex items-center gap-2 text-gray-400 transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Collections
        </Link>

        <h1 className="mb-2 font-unbounded text-3xl font-bold text-white sm:text-4xl">
          Oscar Night Readiness
        </h1>
        <p className="mb-8 text-gray-400">
          Every category, every nominee, counted for you.
        </p>

        {error && (
          <p className="mb-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            Couldn&apos;t load the nominee slate: {error}
          </p>
        )}

        {slate && (
          <>
            {/* Countdown + total, pinned above the list. Two plain numbers, no
                ring — a ring here would read as depleting alongside the days
                remaining rather than showing how much of the slate is seen. */}
            <div className="mb-6 flex items-end justify-between gap-4 rounded-xl border border-gray-800 bg-gray-950/60 px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                  {slate.activeFilmYear} films · ceremony in
                </p>
                <p className="mt-1 font-mono text-4xl font-semibold leading-none text-gold-400 tabular-nums">
                  {slate.daysToNextCeremony ?? "—"}
                  <span className="ml-2 font-sans text-sm font-normal text-gray-500">days</span>
                </p>
              </div>
              {rows.length > 0 && (
                <div className="text-right">
                  <p className="font-mono text-2xl font-semibold leading-none text-gray-100 tabular-nums">
                    {totals.seen}
                    <span className="text-gray-600">/{totals.total}</span>
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">seen</p>
                </div>
              )}
            </div>

            {!slate.isLiveCycle && rows.length > 0 && (
              <p className="mb-6 rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-3 text-sm text-gray-400">
                Showing the <span className="text-gray-200">{slate.shortName}</span> slate —{" "}
                {slate.filmYear} films.{" "}
                {nominationsDate
                  ? `${slate.activeFilmYear} nominees are announced ${nominationsDate}.`
                  : `${slate.activeFilmYear} nominees haven't been announced yet.`}
              </p>
            )}

            {rows.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 px-6 py-12 text-center">
                <p className="text-gray-300">
                  {nominationsDate
                    ? `Nominations are announced ${nominationsDate}.`
                    : "Nominations haven't been announced yet."}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  There&apos;s nothing to track until then.
                </p>
              </div>
            ) : (
              <>
                <ReadinessCategoryList rows={rows} onUpdate={handleUpdate} />
                <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-gray-600">
                  {totals.incomplete === 0
                    ? "Every category complete"
                    : `${totals.incomplete} categories to go`}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
