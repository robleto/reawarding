"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";
import RankingDropdown from "@/components/movie/RankingDropdown";
import SeenItButton from "@/components/movie/SeenItButton";

type Props = {
  movie: Movie;
  currentUserId: string;
  ranking: number | null;
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
	className={`flex flex-col items-center justify-center w-full h-full aspect-[2/3] rounded-xl bg-gray-100 dark:bg-gray-900 ${className}`}
	style={{ minHeight: 0, minWidth: 0 }}
>
<img
	src="/Oscarworthy-logomark.svg"
	alt="Oscarworthy Logo"
	width={80}
	height={120}
	className="mb-2 filter grayscale"
	draggable={false}
/>
	<div className="text-md font-unbounded text-center text-gray-800 dark:text-gray-400 px-2 leading-tight">
		{title}
	</div>
</div>
);

export default function MoviePosterCard({ movie, currentUserId, onUpdate, ranking, seenIt, onClick }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const style = getRatingStyle(ranking ?? 0);

  // Check if poster image exists and is valid
  const hasValidPoster = movie.poster_url && movie.poster_url.trim() !== '' && !movie.poster_url.includes('placeholder') && !imageError;

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger onClick if not clicking overlay or its children
    if (e.target instanceof HTMLElement) {
      const isOverlay = e.target.closest('.movie-poster-overlay');
      if (!isOverlay && onClick) {
        onClick();
      }
    }
  };

  return (
    <div
      className={`relative flex flex-col overflow-visible transition bg-white dark:bg-gray-800 shadow hover:shadow-lg dark:shadow-gray-800 rounded-xl ${onClick ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowDropdown(false); }}
    >
      {hasValidPoster ? (
        <Image
          src={movie.poster_url}
          alt={movie.title}
          width={300}
          height={450}
          className="w-full h-auto rounded-t-xl"
          unoptimized
          onError={() => setImageError(true)}
        />
      ) : (
        <PosterFallback title={movie.title} className="w-full h-full rounded-t-lg" />
      )}
      {/* Overlay on hover */}
      <div
        className={`movie-poster-overlay absolute left-0 right-0 bottom-0 flex flex-col items-center justify-end w-full transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'} z-20`}
        style={{ minHeight: '30%', background: 'linear-gradient(to top, rgba(24,24,27,0.92) 80%, rgba(24,24,27,0.0) 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full px-3 py-2 gap-2">
          {/* Seen It Button */}
          <SeenItButton
            seenIt={seenIt}
            onClick={() => onUpdate(movie.id, { seen_it: !seenIt })}
          />
          {/* Ranking Dropdown */}
          <RankingDropdown
            ranking={ranking}
            onChange={(value) => onUpdate(movie.id, { ranking: value })}
          />
        </div>
      </div>
    </div>
  );
}
