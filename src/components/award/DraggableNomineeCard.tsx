"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { GripVertical, X, Crown, Film } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";

interface DraggableNomineeCardProps {
  movie: Movie;
  isWinner: boolean;
  onSetWinner: (movie: Movie) => void;
  onRemove: (movieId: number) => void;
}

// Fallback component for missing images
const NomineeFallback = ({ 
  className = "" 
}: { 
  title: string; 
  className?: string; 
}) => (
  <div className={`flex items-center justify-center bg-gray-100 text-gray-400 w-24 h-18 ${className}`}>
    <Film className="w-6 h-6" />
  </div>
);

export default function DraggableNomineeCard({
  movie,
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

  const ranking = movie.rankings?.[0]?.ranking ?? 0;
  const ratingStyle = getRatingStyle(ranking);
  const hasValidImage = movie.thumb_url && movie.thumb_url.trim() !== '' && !movie.thumb_url.includes('placeholder');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm
        ${isWinner ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}
        hover:shadow-md transition-shadow w-full
      `}
    >
      {/* Drag Handle - Left side, smaller */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Movie Thumbnail - Smaller, more compact */}
      <div className="flex-shrink-0">
        {hasValidImage ? (
          <Image
            src={movie.thumb_url}
            alt={movie.title}
            width={64}
            height={48}
            className="rounded-md object-cover w-16 h-12"
            unoptimized
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        {!hasValidImage && (
          <NomineeFallback
            title={movie.title}
            className="rounded-md w-16 h-12"
          />
        )}
      </div>

      {/* Movie Info - Takes remaining space */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className="font-semibold text-gray-900 text-sm leading-tight break-words line-clamp-2">
            {movie.title}
          </h4>
          {/* Action buttons - smaller, more compact */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onSetWinner(movie)}
              className={`
                p-1 rounded transition-colors
                ${isWinner 
                  ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200' 
                  : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                }
              `}
              title={isWinner ? 'Remove as winner' : 'Set as winner'}
            >
              <Crown className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRemove(movie.id)}
              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Remove from nominees"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Rating and Winner badge row - more compact */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 text-xs font-bold rounded"
            style={{ backgroundColor: ratingStyle.background, color: ratingStyle.text }}
          >
            {ranking}
          </span>
          {isWinner && (
            <div className="flex items-center gap-1 text-yellow-600">
              <Crown className="w-3 h-3" />
              <span className="text-xs font-medium">Winner</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
