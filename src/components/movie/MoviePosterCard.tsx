"use client";

import { useState } from "react";
import Image from "next/image";
import { shimmer, toBase64 } from "@/utils/imagePlaceholders";
import { normalizeImageUrl } from "@/utils/imageUrl";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";
import RankingDropdown from "@/components/movie/RankingDropdown";
import SeenItButton from "@/components/movie/SeenItButton";

type Props = {
  movie: Movie;
  currentUserId: string | null;
  ranking: number | null;
  ratingLabel?: string | null;
  seenIt: boolean;
  onUpdate: (movieId: number, updates: { seen_it?: boolean; ranking?: number | null }) => void;
  onClick?: () => void;
};

const RANKING_OPTIONS = Array.from({ length: 10 }, (_, i) => 10 - i);

// Fallback component for missing poster images
const PosterFallback = ({ 
  title, 
  className = "" 
}: { 
  title: string; 
  className?: string; 
}) => (
<div 
	className={`flex flex-col items-center justify-center w-full aspect-[2/3] rounded-xl bg-gray-100 dark:bg-gray-900 ${className}`}
>
<img
	src="/reawarding.svg"
	alt="Reawarding Logo"
	className="w-16 sm:w-20 h-auto mb-2 filter grayscale"
	draggable={false}
/>
	<div className="text-xs sm:text-sm font-unbounded text-center text-gray-800 dark:text-gray-400 px-2 leading-tight">
		{title}
	</div>
</div>
);

export default function MoviePosterCard({ movie, currentUserId, onUpdate, ranking, ratingLabel = null, seenIt, onClick }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const style = getRatingStyle(ranking ?? 0);

  // Use poster_url directly (cached_poster_url doesn't exist in schema)
  const posterSrc = movie.poster_url;
  const normalizedPoster = normalizeImageUrl(posterSrc);
  // Ensure we have a valid absolute URL or proper relative path (not just "/" or malformed)
  const isValidUrl = normalizedPoster && 
    (normalizedPoster.startsWith('http://') || 
     normalizedPoster.startsWith('https://') || 
     (normalizedPoster.startsWith('/') && normalizedPoster.length > 1));
  const hasValidPoster = isValidUrl && !imageError;

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger onClick if not clicking overlay or its children
    if (e.target instanceof HTMLElement) {
      const isOverlay = e.target.closest('.movie-poster-overlay');
      if (!isOverlay && onClick) {
        onClick();
      }
    }
  };

  const numericVariance = (() => {
    if (!ratingLabel) return null;
    const clean = ratingLabel.trim();
    const parsed = Number(clean);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  })();

  const showVariancePill = numericVariance !== null && numericVariance !== 0;
  const isPositiveVariance = (numericVariance ?? 0) > 0;

  return (
    <div
      className={`group relative flex flex-col overflow-visible rounded-lg ${onClick ? 'cursor-pointer' : ''} light-glass dark:dark-glass border border-gray-300/40`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowDropdown(false); }}
    >
      {hasValidPoster ? (
        <Image
          src={normalizedPoster}
          alt={movie.title}
          width={210}
          height={325}
          className="w-full h-auto rounded-lg object-cover"
          sizes="(max-width: 640px) 160px, 210px"
          placeholder="blur"
          blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(210,325))}`}
          onError={() => setImageError(true)}
        />
      ) : (
        <PosterFallback title={movie.title} className="w-full h-full rounded-lg" />
      )}
      {/* Overlay on hover */}
      <div
        className={`movie-poster-overlay absolute rounded-b-lg left-0 right-0 bottom-0 flex flex-col items-center justify-end w-full transition-opacity duration-200 z-20
          opacity-100 sm:opacity-0 sm:group-hover:opacity-100`}
        style={{ minHeight: '25%', background: 'linear-gradient(to top, rgba(24,24,27,0.92) 80%, rgba(24,24,27,0.0) 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-b-lg w-full px-3 py-2 gap-2">
          {/* Seen It Button */}
          <SeenItButton
            seenIt={seenIt}
            onClick={() => onUpdate(movie.id, { seen_it: !seenIt })}
          />
          {/* Ranking Dropdown */}
          <div className="flex flex-col items-center">
            <RankingDropdown
              ranking={ranking}
              onChange={(value) => onUpdate(movie.id, { ranking: value })}
            />
            {ratingLabel && (
              showVariancePill ? (
                <span
                  className={`mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-tight ${
                    isPositiveVariance
                      ? "bg-green-500/20 text-green-300 border border-green-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}
                >
                  {isPositiveVariance ? (
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M1 11L5 7L8 10L14 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M1 5L5 9L8 6L14 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span>{ratingLabel}</span>
                </span>
              ) : (
                <span className="mt-0.5 text-[10px] leading-tight text-gray-300">
                  {ratingLabel}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
