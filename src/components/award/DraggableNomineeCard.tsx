"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { GripVertical, X, Crown, Film } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";

interface Movie {
  id: string;
  title: string;
  thumb_url: string;
  poster_url: string;
  ranking: number;
}

interface DraggableNomineeCardProps {
  movie: Movie;
  isWinner: boolean;
  onSetWinner: (movie: Movie) => void;
  onRemove: (movieId: string) => void;
}

// Fallback component for missing images
const NomineeFallback = ({ 
  title, 
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

  const ratingStyle = getRatingStyle(movie.ranking);
  const hasValidImage = movie.thumb_url && movie.thumb_url.trim() !== '' && !movie.thumb_url.includes('placeholder');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-4 p-4 bg-white border rounded-lg shadow-sm
        ${isWinner ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}
        hover:shadow-md transition-shadow min-h-[100px]
      `}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Movie Thumbnail */}
      <div className="flex-shrink-0">
        {hasValidImage ? (
          <Image
            src={movie.thumb_url}
            alt={movie.title}
            width={96}
            height={72}
            className="rounded object-cover"
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
            className="rounded"
          />
        )}
      </div>

      {/* Movie Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 text-lg leading-tight mb-2">
          {movie.title}
        </h4>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-1 text-sm font-bold rounded"
            style={{ backgroundColor: ratingStyle.background, color: ratingStyle.text }}
          >
            {movie.ranking}
          </span>
          {isWinner && (
            <div className="flex items-center gap-1 text-yellow-600">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">Winner</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Set Winner Button */}
        <button
          onClick={() => onSetWinner(movie)}
          className={`
            p-2 rounded-full transition-colors
            ${isWinner 
              ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200' 
              : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
            }
          `}
          title={isWinner ? 'Remove as winner' : 'Set as winner'}
        >
          <Crown className="w-4 h-4" />
        </button>

        {/* Remove Button */}
        <button
          onClick={() => onRemove(movie.id)}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
          title="Remove from nominees"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
