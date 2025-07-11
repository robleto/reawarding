"use client";

import Image from "next/image";
import { Film, Star, Eye, EyeOff, MoreHorizontal, Check } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";
import { useState, useRef, useEffect } from "react";

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
  const [showRatingMenu, setShowRatingMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if image exists and is valid
  const hasValidImage = movie.thumb_url && movie.thumb_url.trim() !== '' && !movie.thumb_url.includes('placeholder');

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowRatingMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setShowRatingMenu(false);
  };

  const toggleSeenIt = () => {
    onUpdate(movie.id, { seen_it: !seenIt });
  };

  const renderRatingMenu = () => (
    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-2 min-w-48">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">Rate this movie</div>
      <div className="grid grid-cols-5 gap-1 mb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
          <button
            key={rating}
            onClick={() => handleRatingSelect(rating)}
            className={`
              px-2 py-1 text-sm rounded transition-colors
              ${ranking === rating 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            {rating}
          </button>
        ))}
      </div>
      <button
        onClick={() => handleRatingSelect(null)}
        className="w-full px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
      >
        Clear rating
      </button>
    </div>
  );

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
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSeenIt();
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
              seenIt 
                ? 'text-green-400 bg-green-400/10 hover:bg-green-400/20' 
                : 'text-gray-400 hover:text-green-400 hover:bg-green-400/10'
            }`}
            title={seenIt ? 'Mark as unseen' : 'Mark as seen'}
          >
            {seenIt ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="hidden lg:inline text-sm">{seenIt ? 'Seen' : 'Unseen'}</span>
          </button>

          {/* Rating */}
          {ranking ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRatingMenu(!showRatingMenu);
              }}
              className="px-2 py-1 text-sm font-medium rounded hover:opacity-80 transition-opacity"
              style={{ backgroundColor: style.background, color: style.text }}
              title="Click to change rating"
            >
              {ranking}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRatingMenu(!showRatingMenu);
              }}
              className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors text-sm"
              title="Rate this movie"
            >
              <Star className="w-4 h-4" />
              <span className="hidden lg:inline">Rate</span>
            </button>
          )}
        </div>

        {/* Rating Menu */}
        <div className="relative" ref={menuRef}>
          {showRatingMenu && renderRatingMenu()}
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSeenIt();
                }}
                className={`flex items-center p-1 rounded transition-colors ${
                  seenIt 
                    ? 'text-green-400 bg-green-400/10' 
                    : 'text-gray-400 hover:text-green-400'
                }`}
                title={seenIt ? 'Mark as unseen' : 'Mark as seen'}
              >
                {seenIt ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>

              {/* Rating */}
              {ranking ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRatingMenu(!showRatingMenu);
                  }}
                  className="px-1.5 py-0.5 text-xs font-medium rounded hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: style.background, color: style.text }}
                  title="Click to change rating"
                >
                  {ranking}
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRatingMenu(!showRatingMenu);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-400 rounded transition-colors"
                  title="Rate this movie"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Rating Menu */}
              <div className="relative" ref={menuRef}>
                {showRatingMenu && renderRatingMenu()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
