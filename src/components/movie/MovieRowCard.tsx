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
      <Film className="w-6 h-6 mx-auto mb-1" />
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


  return (
    <div
      className={`px-4 py-3 mb-3 rounded-xl border border-[#232326]/80 bg-[#1c1c1e]/60 hover:bg-[#232326]/90 transition duration-200 shadow-sm ${
        onClick ? 'cursor-pointer' : ''
      } ${ranking && ranking <= 10 ? 'border-l-4 border-yellow-500' : 'border-l-4 border-transparent'}`}
      onClick={handleClick}
      data-testid="movie-row-card"
      style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)' }}
    >
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between gap-4">
        {/* Ranking Dropdown */}
        <RankingDropdown
          ranking={ranking}
          onChange={(value) => onUpdate(movie.id, { ranking: value })}
        />

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
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white leading-snug truncate">{movie.title}</h3>
          <p className="text-sm text-gray-400">{movie.release_year}</p>
        </div>

        {/* Seen It */}
        <SeenItButton
          seenIt={seenIt}
          onClick={() => onUpdate(movie.id, { seen_it: !seenIt })}
          watchedLabel="Seen It"
        />
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="flex items-stretch gap-3 min-h-[100px]">
          {/* Row Number */}
          {typeof index === 'number' && (
            <div className="w-6 flex items-center justify-end text-xs font-bold text-gray-400 select-none pr-1">
              {index + 1}
            </div>
          )}
          {/* Poster - Full height with proper aspect ratio (wider than taller like Netflix) */}
          <div className="flex-shrink-0">
            {hasValidImage ? (
              <Image
                src={movie.thumb_url}
                alt={movie.title}
                width={160}
                height={90}
                className="rounded-md shadow-md h-full object-cover"
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
                width={160}
                height={90}
                title={movie.title}
                className="rounded-md shadow-md"
              />
            )}
          </div>

          {/* Details - Fill remaining space */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
            <div>
              <h3 className="text-lg font-semibold text-white leading-snug truncate">{movie.title}</h3>
              <p className="text-sm text-gray-400">{movie.release_year}</p>
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
