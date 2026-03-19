"use client";

import MoviePosterCard from "@/components/movie/MoviePosterCard";
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
      <div className="flex gap-2.5 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[160px]">
            <div className="w-[160px] aspect-[2/3] rounded-lg bg-gray-800 animate-pulse" />
            <div className="mt-1.5 h-2 w-14 rounded bg-gray-800 animate-pulse" />
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
 * Each card uses the canonical MoviePosterCard at compact width.
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

  if (rows.length === 0) return null;

  const handleUpdate = onUpdate ?? (() => {});

  return (
    <div className="space-y-7">
      {rows.map((row) => (
        <div key={row.id}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {row.label}
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory">
            {row.films.map((film) => {
              const r = film.rankings?.[0];
              return (
                <div key={film.id} className="flex-shrink-0 w-[160px] snap-start">
                  <MoviePosterCard
                    movie={film}
                    currentUserId={currentUserId}
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
