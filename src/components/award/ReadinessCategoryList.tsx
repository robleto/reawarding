"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import MovieCard from "@/components/award/MovieCard";
import type { Movie } from "@/types/types";

/**
 * The Oscar-night readiness list: one plain row per category, "X of Y seen",
 * incomplete categories first.
 *
 * Deliberately not decorated. There are no trophies, badges, streaks or
 * completion rings here — the job is a fast, math-free status check before
 * Oscar night, and every ornament added to that makes it slower to read. The
 * one visual accent is a gold left edge on categories with films still to
 * watch, because that is the actionable gap the screen exists to surface.
 *
 * A row expands to the films themselves so the gap can be closed in place
 * rather than sending the user off to find each title.
 */

export interface ReadinessRowFilm {
  nominationId: string;
  /** Null when the nominee has no row in our catalog — listed, not trackable. */
  movie: Movie | null;
  workTitle: string;
  isWinner: boolean;
  seen: boolean;
}

export interface ReadinessRow {
  slug: string;
  displayName: string;
  ordinal: number;
  films: ReadinessRowFilm[];
  total: number;
  seen: number;
}

interface Props {
  rows: ReadinessRow[];
  onUpdate: (
    movieId: string,
    updates: { seen_it?: boolean; ranking?: number | null }
  ) => void | Promise<boolean | void>;
}

export default function ReadinessCategoryList({ rows, onUpdate }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Incomplete first — the whole point is surfacing what's left. Within each
  // group the Academy's own category order is preserved, so the list reads
  // the way the telecast runs rather than jumping around alphabetically.
  const ordered = [...rows].sort((a, b) => {
    const aDone = a.seen >= a.total;
    const bDone = b.seen >= b.total;
    if (aDone !== bDone) return aDone ? 1 : -1;
    return a.ordinal - b.ordinal;
  });

  return (
    <ul className="divide-y divide-gray-800/70 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60">
      {ordered.map((row) => {
        const done = row.seen >= row.total;
        const isOpen = expanded === row.slug;
        return (
          // The gold accent is a ::before rail rather than `border-l-2
          // border-gold-500`. `divide-gray-800/70` on the <ul> compiles to a
          // border-color *shorthand* targeting `> :not([hidden]) ~
          // :not([hidden])` — every child except the first — so a per-row
          // border-gold-500 gets overwritten on rows 2..n and only the first
          // row renders gold. A pseudo-element sidesteps the collision.
          <li
            key={row.slug}
            className={`relative ${
              done
                ? ""
                : "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-gold-500"
            }`}
          >
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : row.slug)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors hover:bg-white/5"
            >
              <span className="flex items-center gap-2">
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gray-600 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
                <span className={`text-sm ${done ? "text-gray-500" : "text-gray-200"}`}>
                  {row.displayName}
                </span>
              </span>
              <span
                className={`shrink-0 font-mono text-sm tabular-nums ${
                  done ? "text-gray-600" : "text-gold-300"
                }`}
              >
                {row.seen} of {row.total}
              </span>
            </button>

            {isOpen && (
              <div className="grid grid-cols-2 gap-3 border-t border-gray-800/70 bg-gray-950/40 px-5 py-4 sm:grid-cols-3 lg:grid-cols-5">
                {row.films.map((film) =>
                  film.movie ? (
                    <MovieCard
                      key={film.nominationId}
                      movie={film.movie}
                      variant="grid"
                      seenIt={film.seen}
                      // rankings is the current user's own row and holds at
                      // most one entry — RLS-filtered when signed in, from the
                      // guest store otherwise. Matching the rest of the app,
                      // which reads rankings[0] rather than matching user_id
                      // (guest userId is "", so a user_id match never hits).
                      ranking={film.movie.rankings[0]?.ranking ?? null}
                      onUpdate={onUpdate}
                    />
                  ) : (
                    // No catalog row, so there is nothing to mark seen against.
                    // Say so plainly rather than rendering a checkbox that
                    // silently does nothing.
                    <div
                      key={film.nominationId}
                      className="flex flex-col justify-center rounded-lg border border-dashed border-gray-700 p-3 text-center"
                    >
                      <p className="text-xs text-gray-300">{film.workTitle}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-600">
                        not in catalog
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
