"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { GripVertical, X, Crown, Film } from "lucide-react";
import { RatingBadge } from "./MovieCard";
import { getRatingDefinition } from "@/lib/ratingScale";
import type { Movie } from "@/types/types";
import { normalizeImageUrl } from "@/utils/imageUrl";

interface DraggableNomineeCardProps {
  movie: Movie;
  /** 1-based ballot position — the ballot is ordered, so rank is real information */
  rank?: number;
  isWinner: boolean;
  onSetWinner: (movie: Movie) => void;
  onRemove: (movieId: string) => void;
}

export default function DraggableNomineeCard({
  movie,
  rank,
  isWinner,
  onSetWinner,
  onRemove,
}: DraggableNomineeCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: movie.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const ranking = Math.round(movie.rankings?.[0]?.ranking ?? 0);
  const ratingLabel = ranking > 0 ? getRatingDefinition(ranking)?.label ?? null : null;
  // Posters, not backdrops — same 2:3 crop as the display rows so edit and
  // view mode read as the same list (see 2026-07 thumbs/poster mixup).
  const posterSrc = normalizeImageUrl(movie.poster_url || movie.thumb_url);
  const isValidUrl = posterSrc &&
    (posterSrc.startsWith('http://') ||
     posterSrc.startsWith('https://') ||
     (posterSrc.startsWith('/') && posterSrc.length > 1));
  const hasValidImage = isValidUrl && !posterSrc?.includes('placeholder');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full px-1 py-1 md:px-2 rounded-xl border shadow-sm transition-colors ${
        isWinner
          ? 'border-gold-500/40 bg-gold-500/5 hover:bg-gold-500/10'
          : 'border-gray-700/50 bg-gray-900/60 hover:bg-gray-800/80'
      }`}
    >
      <div className="flex items-center gap-1 min-h-[72px]">
        {/* Drag handle — leftmost, 44px tap target */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center touch-none text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {typeof rank === "number" && (
          <div className="w-5 flex items-center justify-end text-xs font-mono font-bold text-gray-400 tabular-nums select-none pr-1">
            {rank}
          </div>
        )}

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
            {/* Same 44px scale as the display rows' rating chip */}
            <RatingBadge rating={ranking} className="min-w-[44px] min-h-[44px] justify-center text-base" />
            {ratingLabel && (
              <span className="mt-0.5 text-xs leading-tight text-gray-400">{ratingLabel}</span>
            )}
          </div>
          <div className="flex flex-col">
            <button
              onClick={() => onSetWinner(movie)}
              className={`p-2 rounded transition-colors ${
                isWinner
                  ? 'text-gold-400 bg-gold-500/15 hover:bg-gold-500/25'
                  : 'text-gray-500 hover:text-gold-400 hover:bg-gold-500/10'
              }`}
              title={isWinner ? 'Remove as winner' : 'Set as winner'}
            >
              <Crown className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRemove(movie.id)}
              className="p-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Remove from nominees"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
