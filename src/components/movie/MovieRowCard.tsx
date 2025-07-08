"use client";

import Image from "next/image";
import { Film } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";
import RankingDropdown from "@/components/movie/RankingDropdown";
import SeenItButton from "@/components/movie/SeenItButton";

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
      className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 ${!isLast ? 'border-b dark:border-gray-700' : ''} ${onClick ? 'cursor-pointer' : ''} bg-white dark:bg-gray-900`}
      onClick={handleClick}
    >
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between gap-4">
        {/* Poster */}
        {hasValidImage ? (
          <Image
            src={movie.thumb_url}
            alt={movie.title}
            width={100}
            height={75}
            className="rounded-md"
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
            width={100}
            height={75}
            title={movie.title}
            className="rounded shadow"
          />
        )}

        {/* Details */}
        <div className="flex-1">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white">{movie.title}</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">{movie.release_year}</div>
        </div>

        {/* Seen It */}
        <SeenItButton
          seenIt={seenIt}
          onClick={() => onUpdate(movie.id, { seen_it: !seenIt })}
          watchedLabel="Seen It"
        />

        {/* Ranking Dropdown */}
        <RankingDropdown
          ranking={ranking}
          onChange={(value) => onUpdate(movie.id, { ranking: value })}
        />
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
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{movie.title}</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400">{movie.release_year}</div>
            </div>
            
            {/* Controls Row - At bottom */}
            <div className="flex items-center justify-between gap-3 mt-2">
              {/* Seen It */}
              <SeenItButton
                seenIt={seenIt}
                onClick={() => onUpdate(movie.id, { seen_it: !seenIt })}
                watchedLabel="Watched"
              />

              {/* Ranking Dropdown */}
              <RankingDropdown
                ranking={ranking}
                onChange={(value) => onUpdate(movie.id, { ranking: value })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
