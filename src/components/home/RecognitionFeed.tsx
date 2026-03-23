"use client";

import React from "react";
import MovieCard from "@/components/award/MovieCard";
import type { Movie } from "@/types/types";
import type { FeedRow } from "@/hooks/useRecognitionFeed";

interface Props {
  rows: FeedRow[];
  loading: boolean;
  onSelectMovie: (movie: Movie) => void;
  onUpdate?: (movieId: number, updates: { seen_it?: boolean; ranking?: number | null }) => void;
  currentUserId?: string | null;
}

function SkeletonRow() {
  return (
    <div>
      <div className="mb-3 h-2.5 w-28 rounded bg-gray-800 animate-pulse" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[160px] sm:w-[180px]">
            <div className="w-full aspect-[2/3] rounded-xl bg-gray-800 animate-pulse" />
            <div className="mt-2 h-2.5 w-3/4 rounded bg-gray-800 animate-pulse" />
            <div className="mt-1.5 h-2 w-1/2 rounded bg-gray-800 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * RecognitionFeed — 2–3 horizontally-scrollable rows of films the user
 * hasn't rated, designed as "rating triggers" (recognition → instant action).
 *
 * Each card uses the canonical MovieCard (grid variant) at compact width.
 * Clicking opens the YearExplorer for that film.
 */
export default function RecognitionFeed({
  rows,
  loading,
  onSelectMovie,
  onUpdate,
  currentUserId = null,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-7">
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">
        Rate a few films and we&apos;ll find more you&apos;re likely to know.
      </p>
    );
  }

  const handleUpdate = onUpdate ?? (() => {});

  return (
    <div className="space-y-7">
      {rows.map((row) => (
        <div key={row.id}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {row.label}
          </p>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {row.films.map((film) => {
              const r = film.rankings?.[0];
              return (
                <div key={film.id} className="flex-shrink-0 w-[160px] sm:w-[180px] snap-start">
                  <MovieCard
                    variant="large"
                    movie={film}
                    ranking={r?.ranking ?? null}
                    seenIt={r?.seen_it ?? false}
                    onUpdate={handleUpdate}
                    onClick={() => onSelectMovie(film)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
