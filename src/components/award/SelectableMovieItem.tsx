"use client";

import Image from "next/image";
import { Plus, Film } from "lucide-react";
import { RatingBadge } from "./MovieCard";
import { getRatingDefinition } from "@/lib/ratingScale";
import type { Movie } from "@/types/types";
import { normalizeImageUrl } from "@/utils/imageUrl";

interface SelectableMovieItemProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
  disabled?: boolean;
}

export default function SelectableMovieItem({
  movie,
  onSelect,
  disabled = false,
}: SelectableMovieItemProps) {
  const ranking = Math.round(movie.rankings?.[0]?.ranking ?? 0);
  const ratingLabel = ranking > 0 ? getRatingDefinition(ranking)?.label ?? null : null;
  // Posters, not backdrops — same 2:3 crop as the ballot rows.
  const posterSrc = normalizeImageUrl(movie.poster_url || movie.thumb_url);
  const isValidUrl = posterSrc &&
    (posterSrc.startsWith('http://') ||
     posterSrc.startsWith('https://') ||
     (posterSrc.startsWith('/') && posterSrc.length > 1));
  const hasValidImage = isValidUrl && !posterSrc?.includes('placeholder');

  return (
    <div className="w-full px-1 py-1 md:px-2 rounded-xl border border-gray-700/50 bg-gray-900/60 hover:bg-gray-800/80 shadow-sm transition-colors">
      <div className="flex items-center gap-1 min-h-[72px]">
        <div className="flex-shrink-0">
          {hasValidImage ? (
            <Image
              src={posterSrc}
              alt={movie.title}
              width={48}
              height={72}
              className="w-12 h-[72px] rounded-md shadow-md object-cover"
              sizes="48px"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={`${hasValidImage ? 'hidden' : 'flex'} items-center justify-center bg-gray-800 rounded-md`}
            style={{ width: 48, height: 72 }}
          >
            <Film className="w-4 h-4 text-gray-600" />
          </div>
        </div>

        <div className="flex-1 min-w-0 px-2">
          <h4 className="text-sm font-semibold text-white leading-tight line-clamp-2 break-words">
            {movie.title}
          </h4>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 pr-1">
          <div className="flex flex-col items-center">
            {/* Same 44px scale as the ballot rows' rating chip */}
            <RatingBadge rating={ranking} className="min-w-[44px] min-h-[44px] justify-center text-base" />
            {ratingLabel && (
              <span className="mt-0.5 text-xs leading-tight text-gray-400">{ratingLabel}</span>
            )}
          </div>
          <button
            onClick={() => onSelect(movie)}
            disabled={disabled}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${
              disabled
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
            }`}
            title={disabled ? 'Maximum nominees reached' : 'Add to nominees'}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
