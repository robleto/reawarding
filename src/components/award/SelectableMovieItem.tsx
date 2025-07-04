"use client";

import Image from "next/image";
import { Plus, Film } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";

interface Movie {
  id: string;
  title: string;
  thumb_url: string;
  poster_url: string;
  ranking: number;
}

interface SelectableMovieItemProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
  disabled?: boolean;
}

// Fallback component for missing images
const SelectableFallback = ({ 
  title, 
  className = "" 
}: { 
  title: string; 
  className?: string; 
}) => (
  <div className={`flex items-center justify-center bg-gray-100 text-gray-400 w-20 h-15 ${className}`}>
    <Film className="w-5 h-5" />
  </div>
);

export default function SelectableMovieItem({
  movie,
  onSelect,
  disabled = false,
}: SelectableMovieItemProps) {
  const ratingStyle = getRatingStyle(movie.ranking);
  const hasValidImage = movie.thumb_url && movie.thumb_url.trim() !== '' && !movie.thumb_url.includes('placeholder');

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow min-h-[80px]">
      {/* Movie Thumbnail */}
      <div className="flex-shrink-0">
        {hasValidImage ? (
          <Image
            src={movie.thumb_url}
            alt={movie.title}
            width={80}
            height={60}
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
          <SelectableFallback
            title={movie.title}
            className="rounded"
          />
        )}
      </div>

      {/* Movie Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 text-sm leading-tight">
          {movie.title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="px-2 py-1 text-xs font-bold rounded"
            style={{ backgroundColor: ratingStyle.background, color: ratingStyle.text }}
          >
            {movie.ranking}
          </span>
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => onSelect(movie)}
        disabled={disabled}
        className={`
          p-2 rounded-full transition-colors
          ${disabled 
            ? 'text-gray-300 cursor-not-allowed' 
            : 'text-green-400 hover:text-green-600 hover:bg-green-50'
          }
        `}
        title={disabled ? 'Maximum nominees reached' : 'Add to nominees'}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
