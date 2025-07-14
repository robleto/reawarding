"use client";

import Image from "next/image";
import { Film } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";
import RankingDropdown from "./RankingDropdown";
import SeenItButton from "./SeenItButton";

type Props = {
  movie: Movie;
  currentUserId: string;
  ranking: number | null;
  seenIt: boolean;
  isLast?: boolean;
  index?: number;
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
      <Film className="w-4 h-4 mx-auto mb-1" />
      <div className="text-xs font-medium truncate px-2" style={{ maxWidth: width - 8 }}>
        {title}
      </div>
    </div>
  </div>
);

export default function MovieRowCard({ movie, currentUserId, onUpdate, ranking, seenIt, isLast = false, onClick, index }: Props) {
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

  const handleRatingSelect = (newRating: number | null) => {
    onUpdate(movie.id, { ranking: newRating });
  };

  const toggleSeenIt = () => {
    onUpdate(movie.id, { seen_it: !seenIt });
  };

  return (
    <div
      className={`px-2 py-1 md:px-4 md:py-3 mb-2 md:mb-3 rounded-xl border border-[#232326]/80 bg-[#1c1c1e]/60 hover:bg-[#232326]/90 transition duration-200 shadow-sm ${
      onClick ? 'cursor-pointer' : ''
      }`}
      onClick={handleClick}
      data-testid="movie-row-card"
      style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)' }}
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
            className="rounded-md shadow-md"
            unoptimized
            onError={(e) => {
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
            className="rounded-md shadow-md"
          />
        )}

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white leading-snug truncate">{movie.title}</h3>
          <p className="text-sm text-gray-400">{movie.release_year}</p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          {/* Seen It Toggle */}
          <SeenItButton
            seenIt={seenIt}
            onClick={toggleSeenIt}
            showText={true}
            size="md"
            className="hidden lg:inline-flex px-2 py-1 rounded-lg transition-colors bg-opacity-10 hover:bg-opacity-20"
          />
          <SeenItButton
            seenIt={seenIt}
            onClick={toggleSeenIt}
            showText={false}
            size="md"
            variant="compact"
            className="lg:hidden"
          />

          {/* Rating */}
          <RankingDropdown
            ranking={ranking}
            onChange={handleRatingSelect}
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 min-h-[60px]">
          {/* Row Number */}
          {typeof index === 'number' && (
            <div className="w-5 flex items-center justify-end text-xs font-bold text-gray-400 select-none pr-1">
              {index + 1}
            </div>
          )}
          
          {/* Poster */}
          <div className="flex-shrink-0">
            {hasValidImage ? (
              <Image
                src={movie.thumb_url}
                alt={movie.title}
                width={60}
                height={45}
                className="rounded-md shadow-md object-cover"
                unoptimized
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            {!hasValidImage && (
              <ImageFallback
                width={60}
                height={45}
                title={movie.title}
                className="rounded-md shadow-md"
              />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 break-words">{movie.title}</h3>
              <p className="text-xs text-gray-400">{movie.release_year}</p>
            </div>
            
            {/* Status and Actions Row */}
            <div className="flex items-center gap-2 ml-2">
              {/* Seen It Toggle */}
              <SeenItButton
                seenIt={seenIt}
                onClick={toggleSeenIt}
                showText={false}
                size="sm"
                variant="compact"
              />

              {/* Rating */}
              <RankingDropdown
                ranking={ranking}
                onChange={handleRatingSelect}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
