"use client";

import Image from "next/image";
import { Eye, EyeOff, Film } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";

type Props = {
  movie: Movie;
  currentUserId: string;
  ranking: number | null;
  seenIt: boolean;
  isLast?: boolean;
  onUpdate: (movieId: number, updates: { seen_it?: boolean; ranking?: number | null }) => void;
  onClick?: () => void;
};

// Fallback component for missing images
const ImageFallback = ({ 
  width, 
  height, 
  title, 
  className = "" 
}: { 
  width: number; 
  height: number; 
  title: string; 
  className?: string; 
}) => (
  <div 
    className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}
    style={{ width, height }}
  >
    <div className="text-center">
      <Film className="w-6 h-6 mx-auto mb-1" />
      <div className="text-xs font-medium truncate px-2" style={{ maxWidth: width - 8 }}>
        {title}
      </div>
    </div>
  </div>
);

export default function MovieRowCard({ movie, currentUserId, onUpdate, ranking, seenIt, isLast = false, onClick }: Props) {
  const style = getRatingStyle(ranking ?? 0);

  // Check if image exists and is valid
  const hasValidImage = movie.thumb_url && movie.thumb_url.trim() !== '' && !movie.thumb_url.includes('placeholder');

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if user is clicking on interactive elements
    if (e.target instanceof HTMLElement) {
      const isInteractiveElement = e.target.closest('button, select, input, a');
      if (!isInteractiveElement && onClick) {
        onClick();
      }
    }
  };

  return (
    <div 
      className={`px-4 py-3 hover:bg-gray-50 ${!isLast ? 'border-b' : ''} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between gap-4">
        {/* Poster */}
        {hasValidImage ? (
          <Image
            src={movie.thumb_url}
            alt={movie.title}
            width={200}
            height={150}
            className="rounded shadow"
            unoptimized
            onError={(e) => {
              // Hide broken image and show fallback
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        {!hasValidImage && (
          <ImageFallback
            width={200}
            height={150}
            title={movie.title}
            className="rounded shadow"
          />
        )}

        {/* Details */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{movie.title}</h3>
          <div className="text-sm text-gray-600">{movie.release_year}</div>
        </div>

        {/* Seen It */}
        <button
          onClick={() => onUpdate(movie.id, { seen_it: !seenIt })}
          className="flex items-center gap-1 text-sm font-medium"
        >
          {seenIt ? (
            <>
              <Eye className="w-4 h-4 text-blue-600" />
              <span className="text-blue-600">Watched</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Unseen</span>
            </>
          )}
        </button>

        {/* Ranking Dropdown */}
        <div className="relative">
          <select
            value={ranking ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              onUpdate(movie.id, { 
                ranking: value === "" ? null : parseInt(value) 
              });
            }}
            className="px-2 py-1 text-sm font-bold rounded shadow-sm"
            style={{ backgroundColor: style.background, color: style.text }}
          >
            <option value="">–</option>
            {Array.from({ length: 10 }, (_, i) => 10 - i).map((num) => {
              const optStyle = getRatingStyle(num);
              return (
                <option
                  key={num}
                  value={num}
                  style={{ backgroundColor: optStyle.background, color: optStyle.text }}
                >
                  {num}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="flex items-stretch gap-3 min-h-[90px]">
          {/* Poster - Full height with proper aspect ratio (wider than taller like Netflix) */}
          <div className="flex-shrink-0">
            {hasValidImage ? (
              <Image
                src={movie.thumb_url}
                alt={movie.title}
                width={160}
                height={90}
                className="rounded shadow h-full object-cover"
                unoptimized
                onError={(e) => {
                  // Hide broken image and show fallback
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            {!hasValidImage && (
              <ImageFallback
                width={160}
                height={90}
                title={movie.title}
                className="rounded shadow"
              />
            )}
          </div>

          {/* Details - Fill remaining space */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
            <div>
              <h3 className="text-base font-semibold text-gray-900 truncate">{movie.title}</h3>
              <div className="text-sm text-gray-600">{movie.release_year}</div>
            </div>
            
            {/* Controls Row - At bottom */}
            <div className="flex items-center justify-between gap-3 mt-2">
              {/* Seen It */}
              <button
                onClick={() => onUpdate(movie.id, { seen_it: !seenIt })}
                className="flex items-center gap-1 text-sm font-medium"
              >
                {seenIt ? (
                  <>
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-600">Watched</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Unseen</span>
                  </>
                )}
              </button>

              {/* Ranking Dropdown */}
              <div className="relative">
                <select
                  value={ranking ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    onUpdate(movie.id, { 
                      ranking: value === "" ? null : parseInt(value) 
                    });
                  }}
                  className="px-2 py-1 text-sm font-bold rounded shadow-sm"
                  style={{ backgroundColor: style.background, color: style.text }}
                >
                  <option value="">–</option>
                  {Array.from({ length: 10 }, (_, i) => 10 - i).map((num) => {
                    const optStyle = getRatingStyle(num);
                    return (
                      <option
                        key={num}
                        value={num}
                        style={{ backgroundColor: optStyle.background, color: optStyle.text }}
                      >
                        {num}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
