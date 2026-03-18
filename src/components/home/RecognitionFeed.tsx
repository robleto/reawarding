"use client";

import { Star } from "lucide-react";
import { normalizeImageUrl } from "@/utils/imageUrl";
import type { Movie } from "@/types/types";
import type { FeedRow } from "@/hooks/useRecognitionFeed";

interface Props {
  rows: FeedRow[];
  loading: boolean;
  onSelectMovie: (movie: Movie) => void;
}

function SkeletonRow() {
  return (
    <div>
      <div className="mb-3 h-2.5 w-28 rounded bg-gray-800 animate-pulse" />
      <div className="flex gap-2.5 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[76px]">
            <div className="w-[76px] aspect-[2/3] rounded-lg bg-gray-800 animate-pulse" />
            <div className="mt-1.5 h-2 w-14 rounded bg-gray-800 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedCard({
  film,
  onSelect,
}: {
  film: Movie;
  onSelect: (m: Movie) => void;
}) {
  const raw =
    film.cached_poster_url ||
    film.poster_url ||
    film.cached_thumb_url ||
    film.thumb_url ||
    "";
  const posterSrc = normalizeImageUrl(raw);
  const hasPoster =
    posterSrc &&
    (posterSrc.startsWith("http://") ||
      posterSrc.startsWith("https://") ||
      (posterSrc.startsWith("/") && posterSrc.length > 1));

  return (
    <button
      type="button"
      onClick={() => onSelect(film)}
      className="flex-shrink-0 w-[76px] snap-start group text-left"
    >
      {/* Poster */}
      <div className="relative w-[76px] aspect-[2/3] overflow-hidden rounded-lg border border-transparent group-hover:border-yellow-500/50 transition-all shadow-sm bg-gray-800">
        {hasPoster ? (
          <img
            src={posterSrc}
            alt={film.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-800">
            <span className="text-[8px] text-gray-500 text-center leading-tight px-1.5">
              {film.title}
            </span>
          </div>
        )}

        {/* Rate overlay — appears on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
          <span className="flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-gray-900">
            <Star className="h-2.5 w-2.5 fill-current flex-shrink-0" />
            Rate
          </span>
        </div>
      </div>

      {/* Title */}
      <p className="mt-1.5 text-[11px] leading-tight text-gray-400 truncate">
        {film.title}
      </p>
      <p className="text-[10px] text-gray-600">{film.release_year}</p>
    </button>
  );
}

/**
 * RecognitionFeed — 2–3 horizontally-scrollable rows of films the user
 * hasn't rated, designed as "rating triggers" (recognition → instant action).
 *
 * Each card shows a poster + hover ⭐ Rate CTA.
 * Clicking a card calls onSelectMovie, which opens the YearExplorer for that film.
 */
export default function RecognitionFeed({ rows, loading, onSelectMovie }: Props) {
  if (loading) {
    return (
      <div className="space-y-7">
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-7">
      {rows.map((row) => (
        <div key={row.id}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {row.label}
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
            {row.films.map((film) => (
              <FeedCard key={film.id} film={film} onSelect={onSelectMovie} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
