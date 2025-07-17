"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { GripVertical, X, Film } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";
import SeenItButton from "@/components/movie/SeenItButton";
import RankingDropdown from "@/components/movie/RankingDropdown";

// Fallback component for missing poster images (Grid View)
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
      src="/reawarding.svg"
      alt="Reawarding Logo"
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

// Fallback component for missing images (List View)
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

type Props = {
  item: {
    id: string;
    movie: Movie;
    score: number | null;
    seen_it: boolean;
    ranking: number;
  };
  currentUserId: string;
  viewMode: "grid" | "list";
  position: number;
  onUpdate: (updates: { seen_it?: boolean; score?: number | null }) => void;
  onRemove: () => void;
  isEditing: boolean;
};

export default function DraggableMovieCard({
  item,
  currentUserId,
  viewMode,
  position,
  onUpdate,
  onRemove,
  isEditing,
}: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  // console.log("DraggableMovieCard - isEditing:", isEditing, "for movie:", item.movie.title);
  // console.log("🎬 Movie card render:", item.movie.title, "isEditing:", isEditing);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  // console.log("🆔 Sortable ID:", item.id, "Type:", typeof item.id);

  // console.log("🔧 Drag attributes:", { hasAttributes: !!attributes, hasListeners: !!listeners, isDragging });
  // console.log("🎯 Applied attributes/listeners:", isEditing ? { ...attributes, ...listeners } : "NONE");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Check if poster/thumb image exists and is valid
  const hasValidPoster = item.movie.poster_url && item.movie.poster_url.trim() !== '' && !item.movie.poster_url.includes('placeholder') && !imageError;
  const hasValidThumb = item.movie.thumb_url && item.movie.thumb_url.trim() !== '' && !item.movie.thumb_url.includes('placeholder');

  // Get user's seen status and ranking from list item data (not global rankings)
  const userSeenIt = item.seen_it ?? false;
  const userScore = item.score ?? null;

  // Debug logging to see what data we're getting
  console.log("🎬 DraggableMovieCard DEBUG:", {
    movieTitle: item.movie.title,
    itemSeenIt: item.seen_it,
    itemScore: item.score,
    itemRanking: item.ranking,
    userSeenIt,
    userScore,
    fullItem: item
  });

  const ratingStyle = getRatingStyle(userScore ?? 0);

  const handleSeenItToggle = () => {
    onUpdate({ seen_it: !userSeenIt });
  };

  const handleScoreChange = (newScore: number | null) => {
    onUpdate({ score: newScore });
  };

  if (viewMode === "grid") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative flex flex-col overflow-visible border border-[#232326]/80 hover:border-gray-300/50 transition bg-[#1c1c1e]/60 hover:bg-[#232326]/90 shadow hover:shadow-lg rounded-lg ${
          isDragging ? "z-50" : ""
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setShowDropdown(false); }}
      >
        {/* Position Number */}
        <div className="absolute top-2 left-2 z-30 bg-gray-900/80 border border-gray-300/50 text-white text-lg font-unbounded font-bold px-3 py-2 rounded-md shadow-sm backdrop-blur-sm">
          {position}
        </div>

        {/* Drag Handle - ACTIVE drag area */}
        {isEditing && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-16 z-30 p-2 bg-red-500/90 rounded-md shadow-lg transition-colors border-2 border-white cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5 text-white" />
          </div>
        )}

        {/* Remove Button */}
        {isEditing && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 z-30 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Movie Poster */}
        {hasValidPoster ? (
          <Image
            src={item.movie.poster_url}
            alt={item.movie.title}
            width={210}
            height={325}
            className="w-full h-auto rounded-lg object-cover"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <PosterFallback title={item.movie.title} className="w-full h-full rounded-lg" />
        )}

        {/* Overlay on hover or when editing */}
        <div
          className={`absolute rounded-b-lg left-0 right-0 bottom-0 flex flex-col items-center justify-end w-full transition-opacity duration-200 ${
            isHovered || isEditing ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } z-20`}
          style={{ minHeight: '25%', background: 'linear-gradient(to top, rgba(24,24,27,0.92) 80%, rgba(24,24,27,0.0) 100%)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between rounded-b-lg w-full px-3 py-2 gap-2">
            {/* Seen It Button */}
            <SeenItButton
              seenIt={userSeenIt}
              onClick={handleSeenItToggle}
            />
            {/* Score Dropdown */}
            <RankingDropdown
              ranking={userScore}
              onChange={handleScoreChange}
            />
          </div>
        </div>
      </div>
    );
  }

  // List View - Match MovieRowCard styling
  return (
    <div
      ref={setNodeRef}
      style={{ 
        ...style,
        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)' 
      }}
      className={`px-2 py-1 md:px-4 md:py-3 rounded-xl border border-[#232326]/80 bg-[#1c1c1e]/60 hover:bg-[#232326]/90 transition duration-200 shadow-sm ${
        isDragging ? "z-50" : ""
      }`}
      data-testid="movie-row-card"
    >
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between gap-4">
        {/* Drag Handle */}
        {isEditing && (
          <div
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab hover:bg-gray-700/50 rounded transition-colors"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        )}

        {/* Poster */}
        {hasValidPoster ? (
          <Image
            src={item.movie.poster_url}
            alt={item.movie.title}
            width={60}
            height={90}
            className="rounded-md shadow-md object-cover"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <ImageFallback
            width={60}
            height={90}
            title={item.movie.title}
            className="rounded-md shadow-md"
          />
        )}

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white leading-snug truncate">
            <span className="text-gray-300 font-unbounded mr-2">{position}</span>
            {item.movie.title}
          </h3>
          <p className="text-sm text-gray-400">{item.movie.release_year}</p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          {/* Seen It Toggle */}
          <SeenItButton
            seenIt={userSeenIt}
            onClick={handleSeenItToggle}
            showText={true}
            size="md"
            className="hidden lg:inline-flex px-2 py-1 rounded-lg transition-colors bg-opacity-10 hover:bg-opacity-20"
          />
          <SeenItButton
            seenIt={userSeenIt}
            onClick={handleSeenItToggle}
            showText={false}
            size="md"
            variant="compact"
            className="lg:hidden"
          />

          {/* Score */}
          <RankingDropdown
            ranking={userScore}
            onChange={handleScoreChange}
          />

          {/* Remove Button */}
          {isEditing && (
            <button
              onClick={onRemove}
              className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors ml-2"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 min-h-[60px]">          {/* Drag Handle */}
          {isEditing && (
            <div
              {...attributes}
              {...listeners}
              className="p-1 cursor-grab hover:bg-gray-700/50 rounded transition-colors"
            >
              <GripVertical className="w-3 h-3 text-gray-400" />
            </div>
          )}

          {/* Poster */}
          <div className="flex-shrink-0">
            {hasValidPoster ? (
              <Image
                src={item.movie.poster_url}
                alt={item.movie.title}
                width={40}
                height={60}
                className="rounded-md shadow-md object-cover"
                unoptimized
                onError={() => setImageError(true)}
              />
            ) : (
              <ImageFallback
                width={40}
                height={60}
                title={item.movie.title}
                className="rounded-md shadow-md"
              />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 break-words">
                <span className="text-gray-300 font-unbounded mr-2">{position}</span>
                {item.movie.title}
              </h3>
              <p className="text-xs text-gray-400">{item.movie.release_year}</p>
            </div>
            
            {/* Status and Actions Row */}
            <div className="flex items-center gap-2 ml-2">
              {/* Seen It Toggle */}
              <SeenItButton
                seenIt={userSeenIt}
                onClick={handleSeenItToggle}
                showText={false}
                size="sm"
                variant="compact"
              />

              {/* Score */}
              <RankingDropdown
                ranking={userScore}
                onChange={handleScoreChange}
              />

              {/* Remove Button */}
              {isEditing && (
                <button
                  onClick={onRemove}
                  className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-2 h-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
