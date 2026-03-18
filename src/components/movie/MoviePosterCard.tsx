"use client";

import { useState } from "react";
import Image from "next/image";
import { shimmer, toBase64 } from "@/utils/imagePlaceholders";
import { normalizeImageUrl } from "@/utils/imageUrl";
import { Bookmark, ChevronDown, ChevronUp } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";
import RatingModal from "@/components/movie/RatingModal";
import SeenItButton from "@/components/movie/SeenItButton";

type Props = {
  movie: Movie;
  currentUserId: string | null;
  ranking: number | null;
  ratingLabel?: string | null;
  seenIt: boolean;
  onUpdate: (movieId: number, updates: { seen_it?: boolean; ranking?: number | null }) => void;
  onClick?: () => void;
  /** Hide the Seen button and make rating the sole prominent action */
  ratingOnly?: boolean;
  footerAction?: React.ReactNode;
  onWatchlist?: (movieId: number) => void;
  isOnWatchlist?: boolean;
};

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

export default function MoviePosterCard({ movie, currentUserId, onUpdate, ranking, ratingLabel = null, seenIt, onClick, ratingOnly = false, footerAction = null, onWatchlist, isOnWatchlist }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
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
    <>
      <div
        className={`group relative flex flex-col overflow-hidden rounded-lg aspect-[2/3] ${onClick ? 'cursor-pointer' : ''} light-glass dark:dark-glass border border-gray-300/40`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* ── Watchlist bookmark ── only when not yet watched ── */}
        {onWatchlist && !seenIt && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onWatchlist(movie.id); }}
            className="absolute top-2 right-2 z-30 flex items-center justify-center w-7 h-7 rounded-full bg-gray-900/70 backdrop-blur-sm border border-gray-700/50 transition-colors hover:bg-gray-800 hover:border-yellow-500/40"
            title={isOnWatchlist ? "On your watchlist" : "Add to watchlist"}
          >
            <Bookmark
              className={`w-3.5 h-3.5 transition-colors ${isOnWatchlist ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`}
            />
          </button>
        )}
        {hasValidPoster ? (
          <Image
            src={normalizedPoster}
            alt={movie.title}
            width={210}
            height={325}
            className="w-full h-full rounded-lg object-cover"
            sizes="(max-width: 640px) 160px, 210px"
            placeholder="blur"
            blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(210,325))}`}
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <PosterFallback title={movie.title} className="w-full h-full rounded-lg" />
        )}
        {/* Overlay */}
        <div
          className={`movie-poster-overlay absolute rounded-b-lg left-0 right-0 bottom-0 flex flex-col justify-end w-full transition-opacity duration-200 z-20
            ${ratingOnly ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}
          style={{ minHeight: ratingOnly ? '38%' : '25%', background: 'linear-gradient(to top, rgba(24,24,27,0.92) 80%, rgba(24,24,27,0.0) 100%)' }}
          onClick={e => e.stopPropagation()}
        >
          {ratingOnly ? (
            /* ── Cinematic layout: rating badge lower-left, title anchored at bottom ── */
            <div className="flex flex-col gap-1 px-2 py-2 w-full">
              {/* Rating badge */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowRatingModal(true)}
                  className={`font-bold px-1.5 py-0.5 rounded-md border border-gray-700/60 transition-transform active:scale-95 ${ranking ? 'text-xs min-w-[28px]' : 'text-[10px] min-w-[40px]'}`}
                  style={{ backgroundColor: style.background, color: style.text }}
                >
                  {ranking ? <>⭐ {ranking}</> : "☆ Rate"}
                </button>
                {ratingLabel && (
                  showVariancePill ? (
                    <span
                      className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-semibold leading-tight ${
                        isPositiveVariance
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {isPositiveVariance ? (
                        <ChevronUp className="w-2.5 h-2.5" />
                      ) : (
                        <ChevronDown className="w-2.5 h-2.5" />
                      )}
                      <span>{ratingLabel}</span>
                    </span>
                  ) : (
                    <span className="text-[9px] leading-tight text-gray-300">
                      {ratingLabel}
                    </span>
                  )
                )}
                {footerAction}
              </div>
              {/* Title */}
              <p className="text-[10px] sm:text-xs font-semibold text-white leading-tight line-clamp-2">
                {movie.title}
              </p>
            </div>
          ) : (
            /* ── Standard layout: seen + rate side by side ── */
            <div className="flex items-center rounded-b-lg w-full px-3 py-2 gap-2 justify-between">
              <SeenItButton
                seenIt={seenIt}
                onClick={() => onUpdate(movie.id, { seen_it: !seenIt })}
              />
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setShowRatingModal(true)}
                  className={`font-bold px-2 py-1 min-h-[32px] rounded-lg border border-gray-700 bg-gray-900/80 text-white transition-transform active:scale-95 ${ranking ? 'text-sm min-w-[32px]' : 'text-[11px] min-w-[48px]'}`}
                  style={{ backgroundColor: style.background, color: style.text }}
                >
                  {ranking ? <>⭐ {ranking}</> : "☆ Rate"}
                </button>
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
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
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
          )}
        </div>
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        movieTitle={movie.title}
        posterUrl={movie.poster_url}
        currentRating={ranking}
        onRate={(value) => onUpdate(movie.id, { ranking: value })}
        onClose={() => setShowRatingModal(false)}
      />
    </>
  );
}
